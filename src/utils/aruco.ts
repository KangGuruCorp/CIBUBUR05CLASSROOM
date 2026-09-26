import { arucoToSVGString } from 'aruco-marker';
import { PaperOption, PaperCardStudentInfo } from '../types/paperMode';

/**
 * Calculates which option (A, B, C, or D) is facing UP on the camera frame,
 * based on the 4 detected corners from js-aruco2.
 * 
 * In js-aruco2, corners are ordered starting from canonical Top-Left (c0) clockwise:
 * - c0: canonical Top-Left
 * - c1: canonical Top-Right
 * - c2: canonical Bottom-Right
 * - c3: canonical Bottom-Left
 * 
 * On the printed card:
 * - Top edge (c0 to c1): Option A
 * - Right edge (c1 to c2): Option B
 * - Bottom edge (c2 to c3): Option C
 * - Left edge (c3 to c0): Option D
 * 
 * In screen coordinates, the edge that is highest in the physical world has the
 * minimum Y coordinate (closest to 0).
 */
export function getMarkerOrientation(corners: { x: number; y: number }[]): {
  option: PaperOption;
  rotationDegrees: number;
} {
  if (!corners || corners.length < 4) {
    return { option: 'A', rotationDegrees: 0 };
  }

  const [c0, c1, c2, c3] = corners;

  // Midpoint of each of the 4 edges
  const midTop = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 }; // Edge A
  const midRight = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 }; // Edge B
  const midBottom = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 }; // Edge C
  const midLeft = { x: (c3.x + c0.x) / 2, y: (c3.y + c0.y) / 2 }; // Edge D

  // Center of the marker
  const centerX = (c0.x + c1.x + c2.x + c3.x) / 4;
  const centerY = (c0.y + c1.y + c2.y + c3.y) / 4;

  // Vector from center to top edge (A)
  const vecA = { x: midTop.x - centerX, y: midTop.y - centerY };

  // Calculate rotation angle of Edge A relative to UP (0, -1) in degrees (-180 to 180)
  // When Edge A points straight UP, angle is 0°
  // When Edge A points Right, angle is 90°
  // When Edge A points Down, angle is 180°
  // When Edge A points Left, angle is -90° (270°)
  let angle = Math.atan2(vecA.x, -vecA.y) * (180 / Math.PI);
  if (angle < 0) angle += 360;

  // Find edge with lowest Y coordinate (closest to top of frame)
  const edges: { option: PaperOption; y: number }[] = [
    { option: 'A', y: midTop.y },
    { option: 'B', y: midRight.y },
    { option: 'C', y: midBottom.y },
    { option: 'D', y: midLeft.y },
  ];

  edges.sort((a, b) => a.y - b.y);
  const selectedOption = edges[0].option;

  return {
    option: selectedOption,
    rotationDegrees: Math.round(angle),
  };
}

/**
 * Generate SVG string of the inner ArUco marker.
 */
export function getArucoSvgString(markerId: number, size: string = '160px'): string {
  try {
    return arucoToSVGString(markerId, size);
  } catch (err) {
    console.error(`Failed to generate ArUco marker ${markerId}:`, err);
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000"/><text x="50" y="55" fill="#fff" text-anchor="middle" font-size="12">ID ${markerId}</text></svg>`;
  }
}

/**
 * Generate a complete printable HTML / SVG Card for a student with ArUco marker,
 * student metadata, and large prominent A, B, C, D labels.
 */
export function generateStudentCardHtml(student: PaperCardStudentInfo): string {
  const markerSvg = getArucoSvgString(student.markerId, '200px');

  return `
    <div class="paper-card" style="
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      border: 3px solid #1e293b;
      border-radius: 16px;
      padding: 16px;
      background: #ffffff;
      box-sizing: border-box;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      position: relative;
      page-break-inside: avoid;
    ">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
        <div>
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #4338ca; text-transform: uppercase;">GAMI-CLASS • PAPER MODE</div>
          <div style="font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.2;">${student.studentName}</div>
          <div style="font-size: 11px; font-weight: 600; color: #64748b;">${student.className} • No. Absen: ${student.absentNumber ?? '-'}</div>
        </div>
        <div style="text-align: right; background: #f1f5f9; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 4px 10px;">
          <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">Marker ID</div>
          <div style="font-size: 18px; font-weight: 900; color: #1e1b4b; line-height: 1;">#${student.markerId}</div>
        </div>
      </div>

      <!-- Marker with 4 Sides Labels -->
      <div style="position: relative; width: 340px; height: 340px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
        
        <!-- SIDE A (TOP) -->
        <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
          <span style="font-size: 26px; font-weight: 900; color: #1e293b; background: #f8fafc; border: 2.5px solid #1e293b; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">A</span>
          <span style="font-size: 9px; font-weight: 800; color: #475569; margin-top: 2px;">▲ SISI ATAS</span>
        </div>

        <!-- SIDE B (RIGHT) -->
        <div style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); display: flex; align-items: center;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 26px; font-weight: 900; color: #1e293b; background: #f8fafc; border: 2.5px solid #1e293b; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">B</span>
            <span style="font-size: 9px; font-weight: 800; color: #475569; margin-top: 2px;">▶ SISI B</span>
          </div>
        </div>

        <!-- SIDE C (BOTTOM) -->
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
          <span style="font-size: 9px; font-weight: 800; color: #475569; margin-bottom: 2px;">▼ SISI C</span>
          <span style="font-size: 26px; font-weight: 900; color: #1e293b; background: #f8fafc; border: 2.5px solid #1e293b; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">C</span>
        </div>

        <!-- SIDE D (LEFT) -->
        <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); display: flex; align-items: center;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <span style="font-size: 26px; font-weight: 900; color: #1e293b; background: #f8fafc; border: 2.5px solid #1e293b; border-radius: 8px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">D</span>
            <span style="font-size: 9px; font-weight: 800; color: #475569; margin-top: 2px;">◀ SISI D</span>
          </div>
        </div>

        <!-- Central Marker -->
        <div style="width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; border: 2px dashed #cbd5e1; padding: 6px; border-radius: 8px; background: #ffffff;">
          ${markerSvg}
        </div>
      </div>

      <!-- Instructions Footer -->
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1.5px solid #e2e8f0; font-size: 10px; color: #475569; line-height: 1.4; text-align: center;">
        <strong style="color: #0f172a;">Petunjuk:</strong> Putar kartu agar huruf pilihanmu (A, B, C, atau D) berada di sisi <strong>PALING ATAS</strong>, lalu angkat kartu menghadap ke arah guru.
      </div>
    </div>
  `;
}
