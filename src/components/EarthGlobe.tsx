import React, { useEffect, useRef, useState } from "react";

interface CityNode {
  name: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  z: number;
  glow: number;
}

export default function EarthGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = 450;
    let height = canvas.height = 450;

    // Handle mouse move for parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) * 0.05;
      const y = (e.clientY - rect.top - rect.height / 2) * 0.05;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Major Cities of India represented as 3D spherical coordinates
    const cities: CityNode[] = [
      { name: "New Delhi", lat: 28.6139, lng: 77.2090, x: 0, y: 0, z: 0, glow: 1 },
      { name: "Mumbai", lat: 19.0760, lng: 72.8777, x: 0, y: 0, z: 0, glow: 0.8 },
      { name: "Bengaluru", lat: 12.9716, lng: 77.5946, x: 0, y: 0, z: 0, glow: 0.9 },
      { name: "Chennai", lat: 13.0827, lng: 80.2707, x: 0, y: 0, z: 0, glow: 0.7 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639, x: 0, y: 0, z: 0, glow: 0.75 },
      { name: "Hyderabad", lat: 17.3850, lng: 78.4867, x: 0, y: 0, z: 0, glow: 0.85 },
      { name: "Srinagar", lat: 34.0837, lng: 74.7973, x: 0, y: 0, z: 0, glow: 0.6 },
      { name: "Guwahati", lat: 26.1445, lng: 91.7362, x: 0, y: 0, z: 0, glow: 0.5 },
    ];

    let angleX = 0.3; // Tilt of the globe
    let angleY = 0;   // Dynamic rotation
    const globeRadius = 140;

    // Satellites orbiting the Earth
    const satellites = [
      { radius: 180, speed: 0.02, angle: 0, color: "rgba(239, 68, 68, 0.7)" },  // Saffron trail
      { radius: 210, speed: -0.015, angle: Math.PI / 4, color: "rgba(34, 197, 94, 0.7)" }, // Green trail
    ];

    // Background stars
    const stars = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.8 + 0.2,
      speed: Math.random() * 0.02
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render starfield in background
      stars.forEach(star => {
        star.alpha += star.speed;
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.speed = -star.speed;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw outer atmosphere glow of Earth
      const atmosphereGlow = ctx.createRadialGradient(
        centerX, centerY, globeRadius - 20,
        centerX, centerY, globeRadius + 30
      );
      atmosphereGlow.addColorStop(0, "rgba(99, 102, 241, 0.15)");
      atmosphereGlow.addColorStop(0.5, "rgba(59, 130, 246, 0.08)");
      atmosphereGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = atmosphereGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius + 30, 0, Math.PI * 2);
      ctx.fill();

      // Draw Earth body background sphere
      ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
      ctx.strokeStyle = "rgba(129, 140, 248, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotate Y (spinning Earth)
      angleY += 0.004;

      // Draw Grid / Latitudes & Longitudes
      ctx.strokeStyle = "rgba(129, 140, 248, 0.06)";
      ctx.lineWidth = 1;
      for (let j = -4; j <= 4; j++) {
        const latRadius = globeRadius * Math.cos((j * Math.PI) / 10);
        const latY = globeRadius * Math.sin((j * Math.PI) / 10);
        // Project 3D circle of latitude
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const lonRad = (i * Math.PI) / 20;
          // Spherical formula
          const x3d = latRadius * Math.cos(lonRad);
          const y3d = latY;
          const z3d = latRadius * Math.sin(lonRad);

          // Rotate X (tilt)
          const rx1 = x3d;
          const ry1 = y3d * Math.cos(angleX) - z3d * Math.sin(angleX);
          const rz1 = y3d * Math.sin(angleX) + z3d * Math.cos(angleX);

          // Rotate Y (rotation)
          const rx2 = rx1 * Math.cos(angleY) - rz1 * Math.sin(angleY);
          const ry2 = ry1;
          const rz2 = rx1 * Math.sin(angleY) + rz1 * Math.cos(angleY);

          // Only draw visible side (z > 0)
          if (rz2 >= 0) {
            if (i === 0) ctx.moveTo(centerX + rx2, centerY + ry2);
            else ctx.lineTo(centerX + rx2, centerY + ry2);
          }
        }
        ctx.stroke();
      }

      // Project and draw Indian Subcontinent outline approximation with high-fidelity realistic boundary
      // Since it's rotating, we can represent India as a detailed polygon of spherical coords
      const indiaCoords = [
        { lat: 35.5, lng: 74.8 }, // Northern tip (J&K / Gilgit area)
        { lat: 34.3, lng: 77.5 }, // Ladakh / East Kashmir
        { lat: 31.0, lng: 78.5 }, // Himachal / Uttarakhand
        { lat: 28.5, lng: 80.5 }, // Western Nepal border
        { lat: 27.0, lng: 84.8 }, // Southern Nepal border
        { lat: 27.2, lng: 88.0 }, // Sikkim border
        { lat: 27.5, lng: 91.5 }, // Bhutan border
        { lat: 28.2, lng: 94.5 }, // Arunachal Pradesh North
        { lat: 28.0, lng: 96.0 }, // Arunachal Eastern tip
        { lat: 26.0, lng: 97.0 }, // Burma border North
        { lat: 24.0, lng: 94.5 }, // Manipur / Mizoram
        { lat: 22.0, lng: 92.8 }, // Mizoram South tip
        { lat: 23.0, lng: 91.5 }, // Tripura
        { lat: 25.0, lng: 91.8 }, // Meghalaya / Bangladesh North
        { lat: 25.0, lng: 89.8 }, // Meghalaya West
        { lat: 22.5, lng: 89.0 }, // Sunderbans / Bengal-Bangladesh border
        { lat: 21.5, lng: 87.5 }, // West Bengal coast
        { lat: 19.8, lng: 86.0 }, // Odisha / Puri coast
        { lat: 17.5, lng: 83.5 }, // Vizag coast
        { lat: 16.0, lng: 81.5 }, // Andhra coast
        { lat: 13.0, lng: 80.3 }, // Chennai coast
        { lat: 10.3, lng: 79.8 }, // Point Calimere
        { lat: 9.2, lng: 79.0 },  // Pamban Island / Adam's Bridge
        { lat: 8.0, lng: 77.5 },  // Kanyakumari (Southernmost mainland tip)
        { lat: 9.5, lng: 76.3 },  // Kerala coast (Kochi)
        { lat: 11.5, lng: 75.5 }, // Calicut
        { lat: 13.0, lng: 74.8 }, // Mangalore
        { lat: 15.0, lng: 73.8 }, // Goa
        { lat: 17.0, lng: 73.2 }, // Ratnagiri
        { lat: 19.0, lng: 72.8 }, // Mumbai
        { lat: 20.5, lng: 72.7 }, // Daman
        { lat: 21.0, lng: 72.0 }, // Gulf of Khambhat
        { lat: 20.8, lng: 71.0 }, // Diu / Southern Kathiawar
        { lat: 22.3, lng: 69.0 }, // Dwarka / Western Saurashtra tip
        { lat: 23.0, lng: 70.1 }, // Gulf of Kutch
        { lat: 23.5, lng: 68.2 }, // Westernmost tip of Gujarat (Sir Creek)
        { lat: 24.5, lng: 69.0 }, // Rann of Kutch North
        { lat: 24.8, lng: 71.0 }, // Barmer border
        { lat: 26.0, lng: 70.0 }, // Jaisalmer border
        { lat: 28.0, lng: 71.5 }, // Bikaner border
        { lat: 30.5, lng: 73.8 }, // Punjab border
        { lat: 32.5, lng: 74.0 }, // Jammu border
      ];

      ctx.fillStyle = "rgba(16, 185, 129, 0.12)"; // High-tech emerald/green translucent glow of India landmass
      ctx.strokeStyle = "rgba(249, 115, 22, 0.75)"; // Saffron border of India
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      let first = true;

      indiaCoords.forEach(coord => {
        // Translate lat/lng to spherical 3D points
        const phi = (90 - coord.lat) * (Math.PI / 180);
        const theta = (coord.lng + 180) * (Math.PI / 180);

        const x = globeRadius * Math.sin(phi) * Math.cos(theta);
        const y = globeRadius * Math.cos(phi);
        const z = globeRadius * Math.sin(phi) * Math.sin(theta);

        // Rotate tilt
        const rx1 = x;
        const ry1 = y * Math.cos(angleX) - z * Math.sin(angleX);
        const rz1 = y * Math.sin(angleX) + z * Math.cos(angleX);

        // Rotate spin
        const rx2 = rx1 * Math.cos(angleY) - rz1 * Math.sin(angleY);
        const ry2 = ry1;
        const rz2 = rx1 * Math.sin(angleY) + rz1 * Math.cos(angleY);

        if (rz2 >= -15) { // Slight tolerance to complete border polygon nicely
          if (first) {
            ctx.moveTo(centerX + rx2, centerY + ry2);
            first = false;
          } else {
            ctx.lineTo(centerX + rx2, centerY + ry2);
          }
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Project and draw cities
      const projectedCities: CityNode[] = [];
      cities.forEach(city => {
        const phi = (90 - city.lat) * (Math.PI / 180);
        const theta = (city.lng + 180) * (Math.PI / 180);

        // Standard Spherical conversion
        const x = globeRadius * Math.sin(phi) * Math.cos(theta);
        const y = globeRadius * Math.cos(phi);
        const z = globeRadius * Math.sin(phi) * Math.sin(theta);

        // Rotate Tilt
        const rx1 = x;
        const ry1 = y * Math.cos(angleX) - z * Math.sin(angleX);
        const rz1 = y * Math.sin(angleX) + z * Math.cos(angleX);

        // Rotate Spin
        const rx2 = rx1 * Math.cos(angleY) - rz1 * Math.sin(angleY);
        const ry2 = ry1;
        const rz2 = rx1 * Math.sin(angleY) + rz1 * Math.cos(angleY);

        // Save projected coordinates
        city.x = centerX + rx2;
        city.y = centerY + ry2;
        city.z = rz2;

        if (rz2 >= 0) {
          projectedCities.push(city);
        }
      });

      // Draw City Sparkles & Connecting Data Arcs
      projectedCities.forEach((city, idx) => {
        // Draw glow aura
        ctx.fillStyle = `rgba(251, 146, 60, ${0.2 * city.glow})`;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw center sparkle (white core with saffron ring)
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.beginPath();
        ctx.arc(city.x, city.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(251, 146, 60, 0.8)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 4 + Math.sin(Date.now() * 0.01 + idx) * 2, 0, Math.PI * 2);
        ctx.stroke();

        // Connect cities with beautiful visual light-arcs (data paths)
        if (idx < projectedCities.length - 1) {
          const nextCity = projectedCities[idx + 1];
          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(city.x, city.y);
          // Curve upwards for 3D trajectory effect
          const midX = (city.x + nextCity.x) / 2;
          const midY = (city.y + nextCity.y) / 2 - 20;
          ctx.quadraticCurveTo(midX, midY, nextCity.x, nextCity.y);
          ctx.stroke();
        }
      });

      // Animate and draw Satellites
      satellites.forEach(sat => {
        sat.angle += sat.speed;
        const satX = centerX + Math.cos(sat.angle) * sat.radius;
        const satY = centerY + Math.sin(sat.angle) * sat.radius * Math.cos(angleX);

        // Draw trail
        ctx.strokeStyle = sat.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i <= 20; i++) {
          const trailAngle = sat.angle - i * 0.04 * (sat.speed > 0 ? 1 : -1);
          const tX = centerX + Math.cos(trailAngle) * sat.radius;
          const tY = centerY + Math.sin(trailAngle) * sat.radius * Math.cos(angleX);
          ctx.fillStyle = sat.color.replace("0.7", `${0.7 - i * 0.03}`);
          ctx.beginPath();
          ctx.arc(tX, tY, 1.5 - i * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw satellite dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(satX, satY, 3, 0, Math.PI * 2);
        ctx.fill();

        // Sparkling pulse
        ctx.strokeStyle = sat.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(satX, satY, 6 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw decorative orbit text
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.font = "8px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LetsFixIt COMMUNITY RADAR / IND-01", centerX, centerY + globeRadius + 60);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center pointer-events-none overflow-hidden select-none w-full h-[500px]"
      style={{
        transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
        transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="max-w-full drop-shadow-[0_0_35px_rgba(99,102,241,0.25)]"
      />
      {/* Decorative floating label */}
      <div className="absolute top-4 left-4 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-lg p-2.5 flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] text-slate-300 font-mono tracking-wider uppercase">Live Civic Satellite</span>
      </div>
    </div>
  );
}
