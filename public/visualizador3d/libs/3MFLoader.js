( function () {

	/**
	 * Universal 3MF Loader for Three.js
	 * Supports:
	 * - Core 3MF Specification (single & multi-object meshes, components, transforms, units)
	 * - 3MF Production Extension (Bambu Studio, MakerWorld, OrcaSlicer, PrusaSlicer, AnycubicSlicer multi-file 3D/Objects/*.model with p:path)
	 * - Materials & Color Groups (basematerials, colorgroup, m:colorgroup, Bambu project_settings.config filament_colour, paint_color / mmu_segmentation)
	 * - Fast regex-assisted vertex/triangle extraction for high-poly models
	 */

	class ThreeMFLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );
			this.availableExtensions = [];

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			const loader = new THREE.FileLoader( scope.manager );
			loader.setPath( scope.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( scope.requestHeader );
			loader.setWithCredentials( scope.withCredentials );
			loader.load( url, function ( buffer ) {

				try {

					onLoad( scope.parse( buffer ) );

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

			function decodeUTF8( bytes ) {

				if ( ! bytes ) return '';
				const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array( bytes );
				if ( typeof TextDecoder !== 'undefined' ) {
					return new TextDecoder( 'utf-8' ).decode( u8 );
				}
				if ( typeof fflate !== 'undefined' && fflate.strFromU8 ) {
					return fflate.strFromU8( u8 );
				}
				if ( THREE.LoaderUtils && THREE.LoaderUtils.decodeText ) {
					return THREE.LoaderUtils.decodeText( u8 );
				}
				let s = '';
				const chunk = 16384;
				for ( let i = 0; i < u8.length; i += chunk ) {
					s += String.fromCharCode.apply( null, u8.subarray( i, i + chunk ) );
				}
				return s;

			}

			function normalizePath( p ) {

				if ( ! p ) return '';
				return p.replace( /\\/g, '/' ).replace( /^\/+/, '' );

			}

			function parseTransformMatrix( transformStr ) {

				const matrix = new THREE.Matrix4();
				if ( ! transformStr ) return matrix;
				const t = transformStr.trim().split( /\s+/ ).map( Number );
				if ( t.length >= 12 && t.every( isFinite ) ) {
					matrix.set(
						t[ 0 ], t[ 3 ], t[ 6 ], t[ 9 ],
						t[ 1 ], t[ 4 ], t[ 7 ], t[ 10 ],
						t[ 2 ], t[ 5 ], t[ 8 ], t[ 11 ],
						0.0, 0.0, 0.0, 1.0
					);
				}
				return matrix;

			}

			function getUnitScale( unit ) {

				switch ( ( unit || 'millimeter' ).toLowerCase() ) {
					case 'micron': return 0.001;
					case 'millimeter': return 1.0;
					case 'centimeter': return 10.0;
					case 'inch': return 25.4;
					case 'foot': return 304.8;
					case 'meter': return 1000.0;
					default: return 1.0;
				}

			}

			function getAttr( tagStr, attrName ) {

				const re = new RegExp( '(?:^|\\s|[a-zA-Z0-9_]+:)' + attrName + '\\s*=\\s*["\']([^"\']*)["\']', 'i' );
				const m = re.exec( tagStr );
				return m ? m[ 1 ] : null;

			}

			function getExactAttr( tagStr, attrName ) {

				const re = new RegExp( '(?:^|\\s)' + attrName + '\\s*=\\s*["\']([^"\']*)["\']', 'i' );
				const m = re.exec( tagStr );
				return m ? m[ 1 ] : null;

			}

			// 1. Unzip 3MF container
			let u8Data;
			if ( data instanceof Uint8Array ) {
				u8Data = data;
			} else if ( data instanceof ArrayBuffer ) {
				u8Data = new Uint8Array( data );
			} else if ( ArrayBuffer.isView( data ) ) {
				u8Data = new Uint8Array( data.buffer, data.byteOffset, data.byteLength );
			} else {
				throw new Error( 'Formato de buffer 3MF inválido.' );
			}

			let zip = null;
			if ( typeof fflate !== 'undefined' && typeof fflate.unzipSync === 'function' ) {
				zip = fflate.unzipSync( u8Data );
			} else {
				throw new Error( 'Librería de descompresión fflate no disponible.' );
			}

			// Map normalized paths -> actual zip keys
			const zipMap = {};
			const modelFiles = [];
			for ( const rawKey of Object.keys( zip ) ) {
				const norm = normalizePath( rawKey );
				zipMap[ norm ] = rawKey;
				zipMap[ norm.toLowerCase() ] = rawKey;
				if ( /\.model$/i.test( norm ) ) {
					modelFiles.push( norm );
				}
			}

			if ( modelFiles.length === 0 ) {
				throw new Error( 'El archivo 3MF no contiene ningún documento .model.' );
			}

			// 2. Extract optional Slicer / Bambu Studio / PrusaSlicer filament colors & object names
			let slicerFilamentColors = [];
			const objectNameMap = {}; // objectId -> name from model_settings.config

			for ( const normKey of Object.keys( zipMap ) ) {
				if ( /project_settings\.config$/i.test( normKey ) ) {
					try {
						const txt = decodeUTF8( zip[ zipMap[ normKey ] ] );
						const json = JSON.parse( txt );
						const cols = json.filament_colour || json.extruder_colour || json.default_filament_colour;
						if ( Array.isArray( cols ) ) {
							slicerFilamentColors = cols.map( c => ( typeof c === 'string' && c.startsWith( '#' ) ) ? c.substring( 0, 7 ) : null );
						}
					} catch ( e ) { /* ignore optional metadata parse errors */ }
				} else if ( /model_settings\.config$/i.test( normKey ) ) {
					try {
						const txt = decodeUTF8( zip[ zipMap[ normKey ] ] );
						const objBlocks = txt.match( /<object\b[\s\S]*?<\/object>/gi ) || [];
						for ( const block of objBlocks ) {
							const openTag = ( block.match( /^<object\b[^>]*>/i ) || [ '' ] )[ 0 ];
							const oid = getExactAttr( openTag, 'id' );
							const nameMeta = block.match( /<metadata\b[^>]*key\s*=\s*["']name["'][^>]*value\s*=\s*["']([^"']+)["']/i );
							const extruderMeta = block.match( /<metadata\b[^>]*key\s*=\s*["']extruder["'][^>]*value\s*=\s*["'](\d+)["']/i );
							if ( oid ) {
								objectNameMap[ oid ] = {
									name: nameMeta ? nameMeta[ 1 ] : null,
									extruder: extruderMeta ? parseInt( extruderMeta[ 1 ], 10 ) : null
								};
							}
						}
					} catch ( e ) { /* ignore */ }
				}
			}

			// 3. Determine root .model file via _rels/.rels or fallback to 3D/3dmodel.model
			let rootModelPath = null;
			const relsKey = zipMap[ '_rels/.rels' ];
			if ( relsKey && zip[ relsKey ] ) {
				const relsText = decodeUTF8( zip[ relsKey ] );
				const relMatch = relsText.match( /Target\s*=\s*["']([^"']+\.model)["']/i );
				if ( relMatch ) {
					const candidate = normalizePath( relMatch[ 1 ] );
					if ( zipMap[ candidate ] || zipMap[ candidate.toLowerCase() ] ) {
						rootModelPath = candidate;
					}
				}
			}

			if ( ! rootModelPath ) {
				const preferred = modelFiles.find( f => /^3d\/3dmodel\.model$/i.test( f ) );
				rootModelPath = preferred || modelFiles[ 0 ];
			}

			// 4. Parse a .model XML string into structured resources & build items
			const parsedModels = {};

			function parseModelFile( normPath ) {

				const lookupKey = normPath.toLowerCase();
				if ( parsedModels[ lookupKey ] ) return parsedModels[ lookupKey ];

				const actualKey = zipMap[ normPath ] || zipMap[ lookupKey ];
				if ( ! actualKey || ! zip[ actualKey ] ) return null;

				const xmlText = decodeUTF8( zip[ actualKey ] );
				const modelTagMatch = xmlText.match( /<model\b[^>]*>/i );
				const unit = modelTagMatch ? ( getExactAttr( modelTagMatch[ 0 ], 'unit' ) || 'millimeter' ) : 'millimeter';
				const unitScale = getUnitScale( unit );

				// Parse basematerials & colorgroups
				const colorPalettes = {}; // pid -> array of hex color strings

				const baseMatRegex = /<basematerials\b([^>]*)>([\s\S]*?)<\/basematerials>/gi;
				let bmMatch;
				while ( ( bmMatch = baseMatRegex.exec( xmlText ) ) !== null ) {
					const pid = getExactAttr( bmMatch[ 1 ], 'id' );
					if ( pid ) {
						const colors = [];
						const baseRegex = /<base\b([^>]*)\/?>/gi;
						let bMatch;
						while ( ( bMatch = baseRegex.exec( bmMatch[ 2 ] ) ) !== null ) {
							const dc = getExactAttr( bMatch[ 1 ], 'displaycolor' );
							colors.push( dc ? dc.substring( 0, 7 ) : '#3b82f6' );
						}
						colorPalettes[ pid ] = colors;
					}
				}

				const colorGroupRegex = /<(?:[a-zA-Z0-9_]+:)?colorgroup\b([^>]*)>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?colorgroup>/gi;
				let cgMatch;
				while ( ( cgMatch = colorGroupRegex.exec( xmlText ) ) !== null ) {
					const pid = getExactAttr( cgMatch[ 1 ], 'id' );
					if ( pid ) {
						const colors = [];
						const colRegex = /<(?:[a-zA-Z0-9_]+:)?color\b([^>]*)\/?>/gi;
						let cMatch;
						while ( ( cMatch = colRegex.exec( cgMatch[ 2 ] ) ) !== null ) {
							const col = getExactAttr( cMatch[ 1 ], 'color' );
							colors.push( col ? col.substring( 0, 7 ) : '#3b82f6' );
						}
						colorPalettes[ pid ] = colors;
					}
				}

				// Parse <object> nodes
				const objects = {};
				const objectRegex = /<object\b([^>]*)>([\s\S]*?)<\/object>/gi;
				let objMatch;

				while ( ( objMatch = objectRegex.exec( xmlText ) ) !== null ) {

					const objAttrs = objMatch[ 1 ];
					const objBody = objMatch[ 2 ];
					const id = getExactAttr( objAttrs, 'id' );
					if ( ! id ) continue;

					const name = getExactAttr( objAttrs, 'name' ) || ( objectNameMap[ id ] && objectNameMap[ id ].name ) || `Objeto ${id}`;
					const pid = getExactAttr( objAttrs, 'pid' );
					const pindexStr = getExactAttr( objAttrs, 'pindex' );
					const pindex = pindexStr !== null ? parseInt( pindexStr, 10 ) : null;

					const objData = {
						id,
						name,
						pid,
						pindex,
						unitScale,
						mesh: null,
						components: null
					};

					// Check if object has a <mesh>
					const meshMatch = objBody.match( /<mesh\b[^>]*>([\s\S]*?)<\/mesh>/i );
					if ( meshMatch ) {
						const meshXml = meshMatch[ 1 ];
						const vertices = [];
						const vertRegex = /<vertex\b[^>]*?\bx\s*=\s*["']([^"']+)["'][^>]*?\by\s*=\s*["']([^"']+)["'][^>]*?\bz\s*=\s*["']([^"']+)["'][^>]*>/gi;
						let vMatch;
						while ( ( vMatch = vertRegex.exec( meshXml ) ) !== null ) {
							vertices.push(
								parseFloat( vMatch[ 1 ] ) * unitScale,
								parseFloat( vMatch[ 2 ] ) * unitScale,
								parseFloat( vMatch[ 3 ] ) * unitScale
							);
						}

						// Fallback vertex parser if attribute order isn't x, y, z
						if ( vertices.length === 0 ) {
							const genericVertRegex = /<vertex\b([^>]*)\/?>/gi;
							while ( ( vMatch = genericVertRegex.exec( meshXml ) ) !== null ) {
								const attrs = vMatch[ 1 ];
								const vx = parseFloat( getExactAttr( attrs, 'x' ) || '0' ) * unitScale;
								const vy = parseFloat( getExactAttr( attrs, 'y' ) || '0' ) * unitScale;
								const vz = parseFloat( getExactAttr( attrs, 'z' ) || '0' ) * unitScale;
								vertices.push( vx, vy, vz );
							}
						}

						const triangles = [];
						const triColors = [];
						let hasTriangleColors = false;

						const triBlockMatch = meshXml.match( /<triangles\b[^>]*>([\s\S]*?)<\/triangles>/i );
						const triSource = triBlockMatch ? triBlockMatch[ 1 ] : meshXml;
						const triRegex = /<triangle\b([^>]*)\/?>/gi;
						let tMatch;

						while ( ( tMatch = triRegex.exec( triSource ) ) !== null ) {
							const tAttrs = tMatch[ 1 ];
							const v1Match = tAttrs.match( /\bv1\s*=\s*["'](\d+)["']/i );
							const v2Match = tAttrs.match( /\bv2\s*=\s*["'](\d+)["']/i );
							const v3Match = tAttrs.match( /\bv3\s*=\s*["'](\d+)["']/i );
							if ( ! v1Match || ! v2Match || ! v3Match ) continue;

							const v1 = parseInt( v1Match[ 1 ], 10 );
							const v2 = parseInt( v2Match[ 1 ], 10 );
							const v3 = parseInt( v3Match[ 1 ], 10 );
							triangles.push( v1, v2, v3 );

							// Check for color indices (pid/p1 or Bambu paint_color)
							let hexCol = null;
							const tPid = getExactAttr( tAttrs, 'pid' ) || pid;
							const p1Match = tAttrs.match( /\bp1\s*=\s*["'](\d+)["']/i );
							const paintColorMatch = tAttrs.match( /(?:paint_color|mmu_segmentation)\s*=\s*["']([0-9a-fA-F]+)["']/i );

							if ( tPid && colorPalettes[ tPid ] ) {
								const idx = p1Match ? parseInt( p1Match[ 1 ], 10 ) : ( pindex !== null ? pindex : 0 );
								hexCol = colorPalettes[ tPid ][ idx ] || null;
							} else if ( paintColorMatch && slicerFilamentColors.length > 0 ) {
								const code = parseInt( paintColorMatch[ 1 ], 16 );
								// In Bambu/Prusa MMU paint_color, bitmask/nibble maps to extruder index
								let extIdx = 0;
								if ( code === 4 ) extIdx = 0;
								else if ( code === 8 ) extIdx = 1;
								else if ( code === 12 ) extIdx = 2;
								else if ( code > 0 ) extIdx = Math.min( slicerFilamentColors.length - 1, code % slicerFilamentColors.length );
								hexCol = slicerFilamentColors[ extIdx ] || null;
							} else if ( objectNameMap[ id ] && objectNameMap[ id ].extruder && slicerFilamentColors.length > 0 ) {
								const ext = Math.max( 0, objectNameMap[ id ].extruder - 1 );
								hexCol = slicerFilamentColors[ ext ] || null;
							}

							if ( hexCol ) {
								hasTriangleColors = true;
								triColors.push( hexCol );
							} else {
								triColors.push( null );
							}
						}

						if ( vertices.length > 0 && triangles.length > 0 ) {
							objData.mesh = {
								vertices: new Float32Array( vertices ),
								triangles: new Uint32Array( triangles ),
								triColors: hasTriangleColors ? triColors : null
							};
						}
					}

					// Check if object has <components>
					const compBlockMatch = objBody.match( /<components\b[^>]*>([\s\S]*?)<\/components>/i );
					if ( compBlockMatch ) {
						const comps = [];
						const compRegex = /<component\b([^>]*)\/?>/gi;
						let cMatch;
						while ( ( cMatch = compRegex.exec( compBlockMatch[ 1 ] ) ) !== null ) {
							const cAttrs = cMatch[ 1 ];
							const compObjId = getExactAttr( cAttrs, 'objectid' );
							const subPath = getAttr( cAttrs, 'path' ); // matches p:path or path
							const transformStr = getExactAttr( cAttrs, 'transform' );
							if ( compObjId ) {
								comps.push( {
									objectId: compObjId,
									path: subPath ? normalizePath( subPath ) : normPath,
									transform: parseTransformMatrix( transformStr )
								} );
							}
						}
						if ( comps.length > 0 ) {
							objData.components = comps;
						}
					}

					objects[ id ] = objData;

				}

				// Parse <build> items
				const buildItems = [];
				const buildBlockMatch = xmlText.match( /<build\b[^>]*>([\s\S]*?)<\/build>/i );
				if ( buildBlockMatch ) {
					const itemRegex = /<item\b([^>]*)\/?>/gi;
					let iMatch;
					while ( ( iMatch = itemRegex.exec( buildBlockMatch[ 1 ] ) ) !== null ) {
						const iAttrs = iMatch[ 1 ];
						const itemObjId = getExactAttr( iAttrs, 'objectid' );
						const itemPath = getAttr( iAttrs, 'path' );
						const transformStr = getExactAttr( iAttrs, 'transform' );
						if ( itemObjId ) {
							buildItems.push( {
								objectId: itemObjId,
								path: itemPath ? normalizePath( itemPath ) : normPath,
								transform: parseTransformMatrix( transformStr )
							} );
						}
					}
				}

				const parsed = {
					path: normPath,
					unitScale,
					objects,
					build: buildItems
				};
				parsedModels[ lookupKey ] = parsed;
				return parsed;

			}

			// Parse all .model files in the archive
			for ( const mf of modelFiles ) {
				parseModelFile( mf );
			}

			// 5. Build Three.js Meshes / Groups with cycle protection
			function createThreeMeshFromData( meshData, objName ) {

				const geometry = new THREE.BufferGeometry();
				const verts = meshData.vertices;
				const tris = meshData.triangles;

				// Build non-indexed BufferGeometry so vertex painting and planar slicing work seamlessly
				const numTris = Math.floor( tris.length / 3 );
				const positions = new Float32Array( numTris * 9 );
				let colors = null;
				const tmpColor = new THREE.Color( '#3b82f6' );

				if ( meshData.triColors ) {
					colors = new Float32Array( numTris * 9 );
				}

				for ( let i = 0; i < numTris; i ++ ) {
					const i0 = tris[ i * 3 ] * 3;
					const i1 = tris[ i * 3 + 1 ] * 3;
					const i2 = tris[ i * 3 + 2 ] * 3;
					const outIdx = i * 9;

					positions[ outIdx ] = verts[ i0 ] || 0;
					positions[ outIdx + 1 ] = verts[ i0 + 1 ] || 0;
					positions[ outIdx + 2 ] = verts[ i0 + 2 ] || 0;

					positions[ outIdx + 3 ] = verts[ i1 ] || 0;
					positions[ outIdx + 4 ] = verts[ i1 + 1 ] || 0;
					positions[ outIdx + 5 ] = verts[ i1 + 2 ] || 0;

					positions[ outIdx + 6 ] = verts[ i2 ] || 0;
					positions[ outIdx + 7 ] = verts[ i2 + 1 ] || 0;
					positions[ outIdx + 8 ] = verts[ i2 + 2 ] || 0;

					if ( colors ) {
						const hex = meshData.triColors[ i ] || ( slicerFilamentColors[ 0 ] || '#3b82f6' );
						tmpColor.set( hex );
						for ( let v = 0; v < 9; v += 3 ) {
							colors[ outIdx + v ] = tmpColor.r;
							colors[ outIdx + v + 1 ] = tmpColor.g;
							colors[ outIdx + 2 + v ] = tmpColor.b;
						}
					}
				}

				geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
				if ( colors ) {
					geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
				}
				geometry.computeVertexNormals();

				const matOptions = {
					roughness: 0.35,
					metalness: 0.15,
					side: THREE.DoubleSide
				};

				if ( colors ) {
					matOptions.vertexColors = true;
					matOptions.color = new THREE.Color( 0xffffff );
				} else if ( slicerFilamentColors.length > 0 && slicerFilamentColors[ 0 ] ) {
					matOptions.color = new THREE.Color( slicerFilamentColors[ 0 ] );
				} else {
					matOptions.color = new THREE.Color( 0x3b82f6 );
				}

				const material = new THREE.MeshStandardMaterial( matOptions );
				const mesh = new THREE.Mesh( geometry, material );
				mesh.name = objName || 'Pieza 3MF';
				return mesh;

			}

			function instantiateObject( modelPath, objectId, visited ) {

				const normPath = normalizePath( modelPath );
				const key = `${normPath.toLowerCase()}#${objectId}`;
				if ( visited.has( key ) ) return null;

				const nextVisited = new Set( visited );
				nextVisited.add( key );

				let modelData = parseModelFile( normPath );
				let objData = modelData && modelData.objects ? modelData.objects[ objectId ] : null;

				// Fallback: search across all other .model files if objectId wasn't in the specified modelPath
				if ( ! objData ) {
					for ( const otherKey of Object.keys( parsedModels ) ) {
						const candidateModel = parsedModels[ otherKey ];
						if ( candidateModel && candidateModel.objects && candidateModel.objects[ objectId ] ) {
							modelData = candidateModel;
							objData = candidateModel.objects[ objectId ];
							break;
						}
					}
				}

				if ( ! objData ) return null;

				const group = new THREE.Group();
				group.name = objData.name || `Objeto ${objectId}`;

				if ( objData.mesh ) {
					const mesh = createThreeMeshFromData( objData.mesh, objData.name );
					group.add( mesh );
				}

				if ( objData.components && objData.components.length > 0 ) {
					for ( const comp of objData.components ) {
						const targetPath = comp.path || modelData.path;
						const childObj = instantiateObject( targetPath, comp.objectId, nextVisited );
						if ( childObj ) {
							if ( comp.transform ) {
								childObj.applyMatrix4( comp.transform );
							}
							group.add( childObj );
						}
					}
				}

				return group;

			}

			// 6. Assemble Root Group from <build> items
			const rootGroup = new THREE.Group();
			const rootModel = parseModelFile( rootModelPath );

			if ( rootModel && rootModel.build && rootModel.build.length > 0 ) {
				for ( let i = 0; i < rootModel.build.length; i ++ ) {
					const item = rootModel.build[ i ];
					const obj3D = instantiateObject( item.path || rootModel.path, item.objectId, new Set() );
					if ( obj3D ) {
						if ( item.transform ) {
							obj3D.applyMatrix4( item.transform );
						}
						if ( objectNameMap[ item.objectId ] && objectNameMap[ item.objectId ].name ) {
							obj3D.name = objectNameMap[ item.objectId ].name;
						}
						rootGroup.add( obj3D );
					}
				}
			}

			// Fallback: if rootGroup has no meshes, collect all mesh objects from all .model files
			let totalMeshes = 0;
			rootGroup.traverse( c => { if ( c.isMesh ) totalMeshes ++; } );

			if ( totalMeshes === 0 ) {
				for ( const mKey of Object.keys( parsedModels ) ) {
					const mData = parsedModels[ mKey ];
					for ( const oid of Object.keys( mData.objects ) ) {
						const oData = mData.objects[ oid ];
						if ( oData.mesh ) {
							const mesh = createThreeMeshFromData( oData.mesh, oData.name );
							const wrap = new THREE.Group();
							wrap.name = oData.name || `Parte ${oid}`;
							wrap.add( mesh );
							rootGroup.add( wrap );
						}
					}
				}
			}

			return rootGroup;

		}

		addExtension( extension ) {

			this.availableExtensions.push( extension );

		}

	}

	THREE.ThreeMFLoader = ThreeMFLoader;
	THREE[ '3MFLoader' ] = ThreeMFLoader;

} )();
