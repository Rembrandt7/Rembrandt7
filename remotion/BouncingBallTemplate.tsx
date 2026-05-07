import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const BouncingBallTemplate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Fondo celestial (cielo)
  const skyStyle: React.CSSProperties = {
    backgroundColor: "#87CEEB", // Light sky blue
    flex: 1,
    position: "relative",
  };

  // Nivel del agua
  const waterHeight = height * 0.3; // 30% of the bottom is water
  const waterStyle: React.CSSProperties = {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: waterHeight,
    backgroundColor: "rgba(0, 119, 190, 0.8)", // Ocean blue
    borderTop: "5px solid rgba(255, 255, 255, 0.4)",
    zIndex: 10,
  };

  // Parámetros de la pelota
  const ballSize = 100;
  
  // Animación del rebote en el eje Y
  // Usamos el seno absoluto para simular rebotes continuos
  // La velocidad del rebote depende del tiempo
  const bounceFrequency = 0.05; 
  const rawBounce = Math.abs(Math.sin(frame * bounceFrequency * Math.PI));
  
  // Queremos que el balón vaya desde una altura alta (y=100) hasta tocar el agua
  const floorY = height - waterHeight - ballSize; // Punto justo encima del agua
  const peakY = 200; // Punto más alto
  
  // Interpolamos la altura basada en rawBounce
  // 1 = peak, 0 = floor
  const ballY = interpolate(rawBounce, [0, 1], [floorY, peakY]);

  // Posición X (avanza lentamente de izquierda a derecha)
  const startX = width * 0.1;
  const endX = width * 0.8;
  const ballX = interpolate(frame, [0, 300], [startX, endX], {
    extrapolateRight: "clamp",
  });

  // Pelota
  const ballStyle: React.CSSProperties = {
    position: "absolute",
    width: ballSize,
    height: ballSize,
    backgroundColor: "#FF5722", // Pelota naranja brillante
    borderRadius: "50%",
    left: ballX,
    top: ballY,
    boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
    zIndex: 20,
  };

  // Efecto de ondulación (ripples) en el agua cuando golpea
  // La pelota golpea cuando rawBounce está cerca de 0
  const isHittingWater = rawBounce < 0.15;
  const rippleScale = interpolate(rawBounce, [0, 0.15], [2, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const rippleOpacity = interpolate(rawBounce, [0, 0.15], [0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rippleStyle: React.CSSProperties = {
    position: "absolute",
    width: ballSize * 1.5,
    height: ballSize * 0.4,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: "50%",
    left: ballX - (ballSize * 1.5 - ballSize) / 2,
    top: floorY + ballSize - (ballSize * 0.4) / 2,
    transform: `scale(${rippleScale})`,
    opacity: rippleOpacity,
    zIndex: 15,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={skyStyle}>
        <div style={ballStyle} />
        {isHittingWater && <div style={rippleStyle} />}
        <div style={waterStyle} />
        
        {/* Sol estilizado */}
        <div style={{
          position: "absolute", top: 100, right: 100, width: 150, height: 150,
          backgroundColor: "#FFD700", borderRadius: "50%",
          boxShadow: "0 0 50px rgba(255, 215, 0, 0.8)"
        }} />
      </div>
    </AbsoluteFill>
  );
};
