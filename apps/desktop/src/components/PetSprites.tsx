
interface PetSpriteProps {
  type: string;
  tiltX: number;
  tiltY: number;
  facing: "left" | "right";
  isWalking?: boolean;
}

export function PetSprite({ type, tiltX, tiltY, facing, isWalking = false }: PetSpriteProps) {
  // Simple walking bounce animation class using CSS inline styles
  const bounceY = isWalking ? Math.sin(Date.now() / 150) * 2 : 0;
  
  // Limit head tilt range to keep it cute and centered
  const headX = Math.max(-6, Math.min(6, tiltX));
  const headY = Math.max(-4, Math.min(4, tiltY));

  // Determine flip based on facing direction
  const flip = facing === "right" ? -1 : 1;

  const renderPetSVG = () => {
    switch (type) {
      case "cat":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="20" ry="14" fill="#F4A261" />
              <path d="M40 48 C43 48, 45 52, 45 56 C45 60, 42 62, 40 62 C38 62, 35 60, 35 56 C35 52, 37 48, 40 48 Z" fill="#E76F51" opacity="0.3" />
              {/* Feet */}
              <circle cx="28" cy="72" r="5" fill="#E76F51" />
              <circle cx="52" cy="72" r="5" fill="#E76F51" />
              {/* Tail */}
              <path d="M22 62 Q10 58, 8 46 Q6 34, 14 36" stroke="#F4A261" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>
            {/* Head (interactive tilt) */}
            <g transform={`translate(${headX + 40}, ${headY + 36})`}>
              {/* Ears */}
              <path d="M-22 -14 L-24 -32 L-8 -22 Z" fill="#E76F51" />
              <path d="M-19 -16 L-20 -28 L-10 -21 Z" fill="#F4A261" />
              <path d="M22 -14 L24 -32 L8 -22 Z" fill="#E76F51" />
              <path d="M19 -16 L20 -28 L10 -21 Z" fill="#F4A261" />
              {/* Head shape */}
              <circle cx="0" cy="0" r="22" fill="#F4A261" />
              {/* Cheeks */}
              <circle cx="-14" cy="6" r="4" fill="#F28482" opacity="0.7" />
              <circle cx="14" cy="6" r="4" fill="#F28482" opacity="0.7" />
              {/* Face group (tilt slightly more for 3D look) */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                {/* Eyes */}
                <circle cx="-8" cy="-2" r="3" fill="#264653" />
                <circle cx="-9" cy="-3" r="1" fill="#FFFFFF" />
                <circle cx="8" cy="-2" r="3" fill="#264653" />
                <circle cx="7" cy="-3" r="1" fill="#FFFFFF" />
                {/* Nose & Mouth */}
                <polygon points="0,2 -2,0 2,0" fill="#E76F51" />
                <path d="M-2 4 Q0 6, 0 4 Q0 6, 2 4" stroke="#264653" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </g>
              {/* Whiskers */}
              <line x1="-20" y1="4" x2="-28" y2="2" stroke="#264653" strokeWidth="1.5" />
              <line x1="-20" y1="8" x2="-29" y2="9" stroke="#264653" strokeWidth="1.5" />
              <line x1="20" y1="4" x2="28" y2="2" stroke="#264653" strokeWidth="1.5" />
              <line x1="20" y1="8" x2="29" y2="9" stroke="#264653" strokeWidth="1.5" />
            </g>
          </svg>
        );

      case "dog":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="19" ry="14" fill="#E9C46A" />
              <ellipse cx="40" cy="58" rx="12" ry="10" fill="#FFFFFF" />
              {/* Feet */}
              <circle cx="27" cy="72" r="5.5" fill="#E9C46A" />
              <circle cx="53" cy="72" r="5.5" fill="#E9C46A" />
              {/* Collar */}
              <path d="M26 48 Q40 54, 54 48" stroke="#E76F51" strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="40" cy="53" r="3" fill="#F4A261" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 35})`}>
              {/* Ears */}
              <path d="M-20 -12 L-26 -30 L-8 -22 Z" fill="#D8B155" />
              <path d="M20 -12 L26 -30 L8 -22 Z" fill="#D8B155" />
              {/* Head Base */}
              <circle cx="0" cy="0" r="21" fill="#E9C46A" />
              <path d="M-18 6 C-10 14, 10 14, 18 6 C12 -4, -12 -4, -18 6 Z" fill="#FFFFFF" />
              {/* Cheeks */}
              <circle cx="-13" cy="6" r="3.5" fill="#F28482" opacity="0.6" />
              <circle cx="13" cy="6" r="3.5" fill="#F28482" opacity="0.6" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                {/* Eyes */}
                <circle cx="-7" cy="-2" r="2.5" fill="#264653" />
                <circle cx="7" cy="-2" r="2.5" fill="#264653" />
                {/* Snout & Tongue */}
                <ellipse cx="0" cy="3" rx="4" ry="3" fill="#FFFFFF" stroke="#D8B155" strokeWidth="1" />
                <circle cx="0" cy="1" r="1.5" fill="#264653" />
                <path d="M-2 4 Q0 6, 2 4" stroke="#264653" strokeWidth="1.2" fill="none" />
                <path d="M-1.5 5 Q0 9, 1.5 5 Z" fill="#E76F51" />
              </g>
            </g>
          </svg>
        );

      case "bunny":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="60" rx="18" ry="13" fill="#F8F9FA" />
              <ellipse cx="40" cy="60" rx="14" ry="10" fill="#E9ECEF" />
              {/* Feet */}
              <ellipse cx="28" cy="72" rx="5" ry="4" fill="#F8F9FA" />
              <ellipse cx="52" cy="72" rx="5" ry="4" fill="#F8F9FA" />
              {/* Fluffy Tail */}
              <circle cx="22" cy="62" r="5" fill="#E9ECEF" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 36})`}>
              {/* Long Ears */}
              <g transform="rotate(-8)">
                <rect x="-14" y="-38" width="8" height="24" rx="4" fill="#F8F9FA" />
                <rect x="-12" y="-35" width="4" height="18" rx="2" fill="#FFCCD5" />
              </g>
              <g transform="rotate(8)">
                <rect x="6" y="-38" width="8" height="24" rx="4" fill="#F8F9FA" />
                <rect x="8" y="-35" width="4" height="18" rx="2" fill="#FFCCD5" />
              </g>
              {/* Head shape */}
              <circle cx="0" cy="0" r="19" fill="#F8F9FA" />
              <circle cx="-11" cy="5" r="3" fill="#FFCCD5" />
              <circle cx="11" cy="5" r="3" fill="#FFCCD5" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                <circle cx="-6" cy="-2" r="2.5" fill="#2B2D42" />
                <circle cx="6" cy="-2" r="2.5" fill="#2B2D42" />
                <polygon points="0,1 -1.5,-1 1.5,-1" fill="#FFCCD5" />
                <path d="M-1.5 2 Q0 3.5, 0 2 Q0 3.5, 1.5 2" stroke="#2B2D42" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </g>
            </g>
          </svg>
        );

      case "panda":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="19" ry="14" fill="#FFFFFF" stroke="#2B2D42" strokeWidth="1" />
              <ellipse cx="40" cy="58" rx="13" ry="10" fill="#2B2D42" opacity="0.15" />
              {/* Dark Arms & Feet */}
              <ellipse cx="24" cy="58" rx="5" ry="8" fill="#2B2D42" />
              <ellipse cx="56" cy="58" rx="5" ry="8" fill="#2B2D42" />
              <circle cx="29" cy="72" r="5" fill="#2B2D42" />
              <circle cx="51" cy="72" r="5" fill="#2B2D42" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 35})`}>
              {/* Black Ears */}
              <circle cx="-16" cy="-16" r="7.5" fill="#2B2D42" />
              <circle cx="16" cy="-16" r="7.5" fill="#2B2D42" />
              {/* Head Base */}
              <circle cx="0" cy="0" r="20" fill="#FFFFFF" />
              {/* Eye Patches */}
              <ellipse cx="-8" cy="1" rx="5" ry="6.5" fill="#2B2D42" transform="rotate(-15 -8 1)" />
              <ellipse cx="8" cy="1" rx="5" ry="6.5" fill="#2B2D42" transform="rotate(15 8 1)" />
              <circle cx="-12.5" cy="5" r="3" fill="#FFCCD5" opacity="0.5" />
              <circle cx="12.5" cy="5" r="3" fill="#FFCCD5" opacity="0.5" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                {/* Glowing Eyes */}
                <circle cx="-7.5" cy="0" r="2" fill="#FFFFFF" />
                <circle cx="7.5" cy="0" r="2" fill="#FFFFFF" />
                {/* Nose & Mouth */}
                <ellipse cx="0" cy="4" rx="2" ry="1.5" fill="#2B2D42" />
                <path d="M-1.5 6.5 Q0 7.5, 1.5 6.5" stroke="#2B2D42" strokeWidth="1" fill="none" />
              </g>
            </g>
          </svg>
        );

      case "fox":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="18" ry="13" fill="#F26419" />
              {/* White Chest */}
              <ellipse cx="40" cy="56" rx="9" ry="10" fill="#FFF1E6" />
              {/* Feet */}
              <circle cx="28" cy="72" r="5" fill="#333333" />
              <circle cx="52" cy="72" r="5" fill="#333333" />
              {/* Tail */}
              <path d="M24 64 C18 64, 10 58, 12 48 C14 38, 22 42, 24 48 Z" fill="#F26419" />
              <path d="M12 48 C11 44, 13 40, 15 42 Z" fill="#FFFFFF" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 34})`}>
              {/* Pointy Ears */}
              <polygon points="-18,-8 -24,-28 -6,-16" fill="#F26419" />
              <polygon points="-16,-9 -20,-23 -8,-15" fill="#333333" />
              <polygon points="18,-8 24,-28 6,-16" fill="#F26419" />
              <polygon points="16,-9 20,-23 8,-15" fill="#333333" />
              {/* Head shape */}
              <circle cx="0" cy="0" r="19" fill="#F26419" />
              {/* Snout cheeks */}
              <path d="M-19 4 Q-12 14, 0 10 Q12 14, 19 4 C15 0, -15 0, -19 4 Z" fill="#FFF1E6" />
              <circle cx="-12" cy="4" r="3" fill="#FFCCD5" opacity="0.6" />
              <circle cx="12" cy="4" r="3" fill="#FFCCD5" opacity="0.6" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                <circle cx="-7.5" cy="-2" r="2.5" fill="#333333" />
                <circle cx="7.5" cy="-2" r="2.5" fill="#333333" />
                <circle cx="0" cy="3" r="2" fill="#333333" />
                <path d="M-1.5 5 Q0 6, 1.5 5" stroke="#333333" strokeWidth="1" fill="none" />
              </g>
            </g>
          </svg>
        );

      case "hamster":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="20" ry="14" fill="#DDA15E" />
              <ellipse cx="40" cy="58" rx="13" ry="10" fill="#FEFAE0" />
              {/* Feet */}
              <ellipse cx="28" cy="72" rx="4.5" ry="3" fill="#BC6C25" />
              <ellipse cx="52" cy="72" rx="4.5" ry="3" fill="#BC6C25" />
              {/* Hands */}
              <circle cx="22" cy="56" r="3" fill="#BC6C25" />
              <circle cx="58" cy="56" r="3" fill="#BC6C25" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 36})`}>
              {/* Round Ears */}
              <circle cx="-14" cy="-15" r="6" fill="#BC6C25" />
              <circle cx="-14" cy="-15" r="4.5" fill="#FFCCD5" />
              <circle cx="14" cy="-15" r="6" fill="#BC6C25" />
              <circle cx="14" cy="-15" r="4.5" fill="#FFCCD5" />
              {/* Head base */}
              <circle cx="0" cy="0" r="19.5" fill="#DDA15E" />
              {/* Fat Cheek Pads */}
              <ellipse cx="-11" cy="6" rx="7.5" ry="5.5" fill="#FEFAE0" />
              <ellipse cx="11" cy="6" rx="7.5" ry="5.5" fill="#FEFAE0" />
              <circle cx="-13" cy="3" r="3.5" fill="#F28482" />
              <circle cx="13" cy="3" r="3.5" fill="#F28482" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                <circle cx="-6.5" cy="-2.5" r="2.5" fill="#283618" />
                <circle cx="6.5" cy="-2.5" r="2.5" fill="#283618" />
                <circle cx="0" cy="2" r="1.5" fill="#BC6C25" />
                <path d="M-2 4 Q0 6, 0 4 Q0 6, 2 4" stroke="#283618" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                {/* buck tooth */}
                <rect x="-1" y="5.5" width="2" height="2" fill="#FFFFFF" />
              </g>
            </g>
          </svg>
        );

      case "penguin":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="19" ry="14" fill="#2B2D42" />
              <ellipse cx="40" cy="58" rx="12" ry="11" fill="#FFFFFF" />
              {/* Orange feet */}
              <ellipse cx="29" cy="71" rx="5" ry="3" fill="#F4A261" />
              <ellipse cx="51" cy="71" rx="5" ry="3" fill="#F4A261" />
              {/* Wings */}
              <ellipse cx="18" cy="56" rx="4" ry="8.5" fill="#2B2D42" transform="rotate(20 18 56)" />
              <ellipse cx="62" cy="56" rx="4" ry="8.5" fill="#2B2D42" transform="rotate(-20 62 56)" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 34})`}>
              {/* Earmuffs band */}
              <path d="M-15 -10 Q0 -22, 15 -10" stroke="#4EA8DE" strokeWidth="3.5" fill="none" />
              {/* Earmuffs cups */}
              <circle cx="-16" cy="-8" r="5.5" fill="#4EA8DE" />
              <circle cx="16" cy="-8" r="5.5" fill="#4EA8DE" />
              {/* Head Base */}
              <circle cx="0" cy="0" r="18.5" fill="#2B2D42" />
              {/* White face overlay */}
              <ellipse cx="-7" cy="2" rx="7.5" ry="9" fill="#FFFFFF" />
              <ellipse cx="7" cy="2" rx="7.5" ry="9" fill="#FFFFFF" />
              {/* Cheeks */}
              <circle cx="-11.5" cy="5" r="2.5" fill="#FFCCD5" />
              <circle cx="11.5" cy="5" r="2.5" fill="#FFCCD5" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                <circle cx="-5.5" cy="-0.5" r="2" fill="#2B2D42" />
                <circle cx="5.5" cy="-0.5" r="2" fill="#2B2D42" />
                {/* Yellow Beak */}
                <polygon points="0,2 -3,5 3,5" fill="#F4A261" />
              </g>
            </g>
          </svg>
        );

      case "koala":
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              <ellipse cx="40" cy="58" rx="19" ry="13.5" fill="#8D99AE" />
              <ellipse cx="40" cy="57" rx="12" ry="9" fill="#EDF2F4" opacity="0.75" />
              {/* Feet */}
              <circle cx="28" cy="71" r="5.5" fill="#8D99AE" />
              <circle cx="52" cy="71" r="5.5" fill="#8D99AE" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 36})`}>
              {/* Big fluffy gray ears */}
              <circle cx="-16" cy="-14" r="9.5" fill="#8D99AE" />
              <circle cx="-15" cy="-14" r="6.5" fill="#EDF2F4" />
              <circle cx="16" cy="-14" r="9.5" fill="#8D99AE" />
              <circle cx="16" cy="-14" r="6.5" fill="#EDF2F4" />
              {/* Head Base */}
              <circle cx="0" cy="0" r="19" fill="#8D99AE" />
              <circle cx="-11" cy="5" r="3" fill="#FFCCD5" opacity="0.6" />
              <circle cx="11" cy="5" r="3" fill="#FFCCD5" opacity="0.6" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                <circle cx="-6.5" cy="-2.5" r="2.5" fill="#2B2D42" />
                <circle cx="6.5" cy="-2.5" r="2.5" fill="#2B2D42" />
                {/* Big dark oval nose */}
                <ellipse cx="0" cy="3.5" rx="3.5" ry="6.5" fill="#2B2D42" />
              </g>
            </g>
          </svg>
        );

      default: // "robot"
        return (
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Body */}
            <g transform={`translate(${bounceY * 0.2}, ${bounceY})`}>
              {/* Retro Computer Case */}
              <rect x="23" y="46" width="34" height="20" rx="4" fill="#8E9AAF" />
              {/* Dark internal grill */}
              <rect x="28" y="51" width="24" height="10" rx="2" fill="#2F3E46" />
              {/* Glowing core/heart */}
              <circle cx="40" cy="56" r="3" fill="#4EA8DE" />
              {/* Small treads/feet */}
              <rect x="26" y="66" width="9" height="5" rx="1.5" fill="#2F3E46" />
              <rect x="45" y="66" width="9" height="5" rx="1.5" fill="#2F3E46" />
            </g>
            {/* Head */}
            <g transform={`translate(${headX + 40}, ${headY + 33})`}>
              {/* Antenna */}
              <line x1="0" y1="-18" x2="0" y2="-28" stroke="#2F3E46" strokeWidth="3" />
              <circle cx="0" cy="-30" r="4.5" fill="#4EA8DE" />
              
              {/* Head shape */}
              <rect x="-21" y="-18" width="42" height="34" rx="6" fill="#8E9AAF" />
              {/* Glowing Screen background */}
              <rect x="-16" y="-13" width="32" height="24" rx="3" fill="#2F3E46" />
              <circle cx="-12.5" cy="12" r="2.5" fill="#FFCCD5" opacity="0.4" />
              <circle cx="12.5" cy="12" r="2.5" fill="#FFCCD5" opacity="0.4" />
              {/* Face */}
              <g transform={`translate(${headX * 0.4}, ${headY * 0.4})`}>
                {/* Glowing neon eyes */}
                <circle cx="-7" cy="-2" r="3.5" fill="#4EA8DE" />
                <circle cx="-7" cy="-2" r="1.5" fill="#FFFFFF" />
                <circle cx="7" cy="-2" r="3.5" fill="#4EA8DE" />
                <circle cx="7" cy="-2" r="1.5" fill="#FFFFFF" />
                
                {/* mouth line */}
                <rect x="-6" y="5" width="12" height="2" rx="1" fill="#4EA8DE" />
              </g>
            </g>
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `scaleX(${flip})`,
        transition: "transform 0.2s ease-out",
        userSelect: "none",
        width: "100%",
        height: "100%",
      }}
    >
      {renderPetSVG()}
    </div>
  );
}
