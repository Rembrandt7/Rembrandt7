( function () {

	class STLLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( text ) {

				try {

					onLoad( scope.parse( text ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		parse( data ) {

			function toArrayBuffer( input ) {

				if ( input instanceof ArrayBuffer ) return input;
				if ( ArrayBuffer.isView( input ) ) {
					return input.buffer.slice( input.byteOffset, input.byteOffset + input.byteLength );
				}
				if ( typeof input === 'string' ) {
					const arr = new Uint8Array( input.length );
					for ( let i = 0; i < input.length; i ++ ) {
						arr[ i ] = input.charCodeAt( i ) & 0xff;
					}
					return arr.buffer;
				}
				return input;

			}

			function isBinary( buffer ) {

				if ( ! buffer || buffer.byteLength < 84 ) return false;

				const reader = new DataView( buffer );
				const face_size = ( 32 / 8 * 3 ) + ( ( 32 / 8 * 3 ) * 3 ) + ( 16 / 8 );
				const n_faces = reader.getUint32( 80, true );
				const expect = 80 + ( 32 / 8 ) + ( n_faces * face_size );

				if ( expect === reader.byteLength ) {
					return true;
				}

				// Check if there are null bytes (0x00) after the 80-byte header:
				// Binary STLs almost always contain 0x00 bytes in float32s or uint16 attribute counts,
				// whereas valid ASCII STLs never contain 0x00 bytes.
				const checkEnd = Math.min( reader.byteLength, 1024 );
				let nullCount = 0;
				for ( let i = 84; i < checkEnd; i ++ ) {
					if ( reader.getUint8( i ) === 0 ) {
						nullCount ++;
					}
				}
				if ( nullCount > 2 ) {
					return true;
				}

				// Check if first 256 bytes contain "facet" or "vertex" (case-insensitive)
				const headerSample = decodeTextSample( buffer, 0, Math.min( buffer.byteLength, 512 ) );
				if ( /facet\s+normal|vertex\s+[+-]?\d/i.test( headerSample ) ) {
					return false;
				}

				return reader.byteLength >= 134;

			}

			function decodeTextSample( buffer, start, end ) {

				const bytes = new Uint8Array( buffer, start, end - start );
				let str = '';
				for ( let i = 0; i < bytes.length; i ++ ) {
					str += String.fromCharCode( bytes[ i ] );
				}
				return str;

			}

			function ensureString( buffer ) {

				if ( typeof buffer === 'string' ) return buffer;
				const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array( buffer );
				if ( typeof TextDecoder !== 'undefined' ) {
					return new TextDecoder( 'utf-8' ).decode( bytes );
				}
				if ( THREE.LoaderUtils && THREE.LoaderUtils.decodeText ) {
					return THREE.LoaderUtils.decodeText( bytes );
				}
				let s = '';
				const chunk = 16384;
				for ( let i = 0; i < bytes.length; i += chunk ) {
					s += String.fromCharCode.apply( null, bytes.subarray( i, i + chunk ) );
				}
				return s;

			}

			function parseBinary( buffer ) {

				if ( ! buffer || buffer.byteLength < 84 ) {
					return new THREE.BufferGeometry();
				}

				const reader = new DataView( buffer );
				const dataOffset = 84;
				const faceLength = 12 * 4 + 2; // 50 bytes per triangle
				const maxFacesBySize = Math.floor( ( reader.byteLength - dataOffset ) / faceLength );
				let headerFaces = reader.getUint32( 80, true );

				// Safely clamp faces count so malformed headers or padded files never throw RangeError
				const faces = ( headerFaces > 0 && headerFaces <= maxFacesBySize ) ? headerFaces : maxFacesBySize;

				let r, g, b, hasColors = false, colors;
				let defaultR = 1, defaultG = 1, defaultB = 1, alpha = 1;

				for ( let index = 0; index < 80 - 10; index ++ ) {

					if (
						reader.getUint32( index, false ) == 0x434F4C4F /*COLO*/ &&
						reader.getUint8( index + 4 ) == 0x52 /*'R'*/ &&
						reader.getUint8( index + 5 ) == 0x3D /*'='*/
					) {

						hasColors = true;
						colors = new Float32Array( faces * 3 * 3 );
						defaultR = reader.getUint8( index + 6 ) / 255;
						defaultG = reader.getUint8( index + 7 ) / 255;
						defaultB = reader.getUint8( index + 8 ) / 255;
						alpha = reader.getUint8( index + 9 ) / 255;

					}

				}

				const geometry = new THREE.BufferGeometry();
				const vertices = new Float32Array( faces * 3 * 3 );
				const normals = new Float32Array( faces * 3 * 3 );

				for ( let face = 0; face < faces; face ++ ) {

					const start = dataOffset + face * faceLength;
					let normalX = reader.getFloat32( start, true );
					let normalY = reader.getFloat32( start + 4, true );
					let normalZ = reader.getFloat32( start + 8, true );

					if ( ! isFinite( normalX ) ) normalX = 0;
					if ( ! isFinite( normalY ) ) normalY = 0;
					if ( ! isFinite( normalZ ) ) normalZ = 0;

					if ( hasColors ) {

						const packedColor = reader.getUint16( start + 48, true );

						if ( ( packedColor & 0x8000 ) === 0 ) {

							r = ( packedColor & 0x1F ) / 31;
							g = ( ( packedColor >> 5 ) & 0x1F ) / 31;
							b = ( ( packedColor >> 10 ) & 0x1F ) / 31;

						} else {

							r = defaultR;
							g = defaultG;
							b = defaultB;

						}

					}

					for ( let i = 1; i <= 3; i ++ ) {

						const vertexstart = start + i * 12;
						const componentIdx = face * 3 * 3 + ( i - 1 ) * 3;
						let vx = reader.getFloat32( vertexstart, true );
						let vy = reader.getFloat32( vertexstart + 4, true );
						let vz = reader.getFloat32( vertexstart + 8, true );

						if ( ! isFinite( vx ) ) vx = 0;
						if ( ! isFinite( vy ) ) vy = 0;
						if ( ! isFinite( vz ) ) vz = 0;

						vertices[ componentIdx ] = vx;
						vertices[ componentIdx + 1 ] = vy;
						vertices[ componentIdx + 2 ] = vz;
						normals[ componentIdx ] = normalX;
						normals[ componentIdx + 1 ] = normalY;
						normals[ componentIdx + 2 ] = normalZ;

						if ( hasColors ) {

							colors[ componentIdx ] = r;
							colors[ componentIdx + 1 ] = g;
							colors[ componentIdx + 2 ] = b;

						}

					}

				}

				geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
				geometry.setAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );

				if ( hasColors ) {

					geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
					geometry.hasColors = true;
					geometry.alpha = alpha;

				}

				return geometry;

			}

			function parseASCII( text ) {

				const geometry = new THREE.BufferGeometry();
				const patternFloat = /[\s,]+([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.source;
				const patternVertex = new RegExp( 'vertex' + patternFloat + patternFloat + patternFloat, 'gi' );
				const patternNormal = new RegExp( 'normal' + patternFloat + patternFloat + patternFloat, 'gi' );
				const patternFace = /facet([\s\S]*?)endfacet/gi;

				const vertices = [];
				const normals = [];
				let faceMatch;

				while ( ( faceMatch = patternFace.exec( text ) ) !== null ) {

					const faceBlock = faceMatch[ 0 ];
					let nx = 0, ny = 0, nz = 0;
					patternNormal.lastIndex = 0;
					const nRes = patternNormal.exec( faceBlock );
					if ( nRes ) {
						nx = parseFloat( nRes[ 1 ] ) || 0;
						ny = parseFloat( nRes[ 2 ] ) || 0;
						nz = parseFloat( nRes[ 3 ] ) || 0;
					}

					patternVertex.lastIndex = 0;
					let vRes;
					const faceVerts = [];
					while ( ( vRes = patternVertex.exec( faceBlock ) ) !== null ) {
						faceVerts.push(
							parseFloat( vRes[ 1 ] ) || 0,
							parseFloat( vRes[ 2 ] ) || 0,
							parseFloat( vRes[ 3 ] ) || 0
						);
					}

					if ( faceVerts.length >= 9 ) {
						for ( let i = 0; i < 9; i += 3 ) {
							vertices.push( faceVerts[ i ], faceVerts[ i + 1 ], faceVerts[ i + 2 ] );
							normals.push( nx, ny, nz );
						}
					}

				}

				// Fallback if file doesn't use strict facet/endfacet blocks
				if ( vertices.length === 0 ) {
					patternVertex.lastIndex = 0;
					let vRes;
					const rawVerts = [];
					while ( ( vRes = patternVertex.exec( text ) ) !== null ) {
						rawVerts.push(
							parseFloat( vRes[ 1 ] ) || 0,
							parseFloat( vRes[ 2 ] ) || 0,
							parseFloat( vRes[ 3 ] ) || 0
						);
					}
					const usable = Math.floor( rawVerts.length / 9 ) * 9;
					for ( let i = 0; i < usable; i ++ ) {
						vertices.push( rawVerts[ i ] );
						normals.push( 0 );
					}
				}

				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
				geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
				if ( vertices.length > 0 ) {
					geometry.computeVertexNormals();
				}
				return geometry;

			}

			const binData = toArrayBuffer( data );
			const binaryDetected = isBinary( binData );

			if ( binaryDetected ) {
				const geo = parseBinary( binData );
				if ( geo.attributes.position && geo.attributes.position.count > 0 ) {
					return geo;
				}
				return parseASCII( ensureString( binData ) );
			} else {
				const geo = parseASCII( ensureString( data ) );
				if ( geo.attributes.position && geo.attributes.position.count > 0 ) {
					return geo;
				}
				return parseBinary( binData );
			}

		}

	}

	THREE.STLLoader = STLLoader;

} )();
