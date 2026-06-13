import { useEffect, useState, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { PetSprite } from "./PetSprites";

interface PetWindowContentProps {
  initialType?: string;
}

const BUBBLES_EN = [
  "Checking for clean code... 📋",
  "I love Tauri! ⚡",
  "Need a break? Stretch a bit! 🧘",
  "Code compiles! Time for coffee ☕",
  "No warnings, no bugs! 🎉",
  "Keep going, you're doing great! 🚀",
  "Let me handle the sidecars 🛠️",
  "Writing tests is fun... sometimes! 🧪",
  "Is the backend running? 🖥️",
  "Let's build something beautiful! 🎨",
];

const BUBBLES_AR = [
  "أتحقق من نظافة الكود... 📋",
  "أنا أحب Tauri! ⚡",
  "هل تحتاج استراحة؟ قم بالتمدد قليلاً! 🧘",
  "الكود يعمل بنجاح! وقت القهوة ☕",
  "لا توجد أخطاء أو تحذيرات! 🎉",
  "استمر، أنت تبلي بلاءً حسناً! 🚀",
  "دعني أهتم بالـ sidecars 🛠️",
  "كتابة الاختبارات ممتعة... أحياناً! 🧪",
  "هل الخادم يعمل؟ 🖥️",
  "دعنا نبني شيئاً جميلاً! 🎨",
];

export function PetWindowContent({ initialType = "robot" }: PetWindowContentProps) {
  const [petType, setPetType] = useState<string>(initialType);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [facing, setFacing] = useState<"left" | "right">("left");
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [locale, setLocale] = useState<string>("en");

  // Keep track of actual window position
  const positionRef = useRef({ x: 400, y: 400 });
  const targetRef = useRef({ x: 400, y: 400 });
  const isDraggingRef = useRef<boolean>(false);
  const lastInteractionRef = useRef<number>(Date.now());
  const nextWalkTimeRef = useRef<number>(Date.now() + 3000);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with local storage on load and on change
  useEffect(() => {
    // Determine language from localStorage
    const savedLocale = localStorage.getItem("app-locale") || "en";
    setLocale(savedLocale);

    // Sync pet type from localStorage
    const savedPet = localStorage.getItem("selected-pet");
    if (savedPet) {
      setPetType(savedPet);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "selected-pet" && e.newValue) {
        setPetType(e.newValue);
      }
      if (e.key === "app-locale" && e.newValue) {
        setLocale(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sync starting position
  const syncPosition = async () => {
    try {
      const appWindow = getCurrentWindow() as any;
      const actualPos = await appWindow.outerPosition();
      const monitor = await appWindow.currentMonitor();
      if (monitor) {
        const scaleFactor = monitor.scaleFactor || 1;
        positionRef.current = {
          x: actualPos.x / scaleFactor,
          y: actualPos.y / scaleFactor,
        };
      }
    } catch (e) {
      console.error("Failed to sync position:", e);
    }
  };

  // Setup initial position at the bottom center of the monitor
  useEffect(() => {
    const initWindowPosition = async () => {
      try {
        const appWindow = getCurrentWindow() as any;
        const monitor = await appWindow.currentMonitor();
        if (monitor) {
          const scaleFactor = monitor.scaleFactor || 1;
          const screenW = monitor.size.width / scaleFactor;
          const screenH = monitor.size.height / scaleFactor;
          
          // Position at bottom center (150 width, 150 height)
          const startX = (screenW - 150) / 2;
          const startY = screenH - 190;
          
          await appWindow.setPosition(new LogicalPosition(startX, startY));
          positionRef.current = { x: startX, y: startY };
          targetRef.current = { x: startX, y: startY };
        }
      } catch (e) {
        console.error("Error setting initial window position:", e);
      }
    };
    void initWindowPosition();
  }, []);

  // Smooth walking animation loop
  useEffect(() => {
    const speed = 1.5; // logical pixels per tick
    
    const interval = setInterval(async () => {
      if (isDraggingRef.current) return;

      // If there was a recent user interaction (drag/click), pause walking
      if (Date.now() - lastInteractionRef.current < 6000) {
        setIsWalking(false);
        return;
      }

      const dx = targetRef.current.x - positionRef.current.x;
      const dy = targetRef.current.y - positionRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // Move towards target
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        
        positionRef.current.x += vx;
        positionRef.current.y += vy;
        
        setIsWalking(true);
        setFacing(vx > 0 ? "right" : "left");
        
        try {
          const appWindow = getCurrentWindow() as any;
          await appWindow.setPosition(
            new LogicalPosition(positionRef.current.x, positionRef.current.y)
          );
        } catch (e) {
          console.error("Failed to set window position:", e);
        }
      } else {
        // We are resting
        setIsWalking(false);

        // Check if it's time to pick a new target
        if (Date.now() > nextWalkTimeRef.current) {
          try {
            const appWindow = getCurrentWindow() as any;
            const monitor = await appWindow.currentMonitor();
            if (monitor) {
              const scaleFactor = monitor.scaleFactor || 1;
              const screenW = monitor.size.width / scaleFactor;
              const screenH = monitor.size.height / scaleFactor;
              
              // Pick random target X
              const nextX = Math.max(50, Math.random() * (screenW - 200));
              // Pick Y in bottom band
              const nextY = screenH - 190 + (Math.random() * 40 - 20);
              
              targetRef.current = { x: nextX, y: nextY };
              nextWalkTimeRef.current = Date.now() + Math.random() * 8000 + 6000;
              
              // 35% chance to show bubble text
              if (Math.random() < 0.35 && !bubbleText) {
                const bubbleList = locale.startsWith("ar") ? BUBBLES_AR : BUBBLES_EN;
                const randMsg = bubbleList[Math.floor(Math.random() * bubbleList.length)];
                setBubbleText(randMsg);
                
                if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
                bubbleTimeoutRef.current = setTimeout(() => {
                  setBubbleText(null);
                }, 4000);
              }
            }
          } catch (e) {
            console.error("Error choosing new target:", e);
          }
        }
      }
    }, 35);

    return () => {
      clearInterval(interval);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [bubbleText, locale]);

  // Handle cursor interaction (eye tracking)
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Relative to center of 150x150 container (75, 75)
    const dx = x - 75;
    const dy = y - 75;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    const tiltX = Math.cos(angle) * Math.min(8, dist / 8);
    const tiltY = Math.sin(angle) * Math.min(6, dist / 8);
    
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Handle Dragging
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
      lastInteractionRef.current = Date.now();
      setTilt({ x: 0, y: 0 });

      try {
        const appWindow = getCurrentWindow() as any;
        await appWindow.startDragging();
      } catch (err) {
        console.error("Window drag error:", err);
      }

      isDraggingRef.current = false;
      lastInteractionRef.current = Date.now();
      await syncPosition();
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      style={{
        width: "150px",
        height: "150px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        overflow: "hidden",
        background: "transparent",
        cursor: "grab",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Speech Bubble */}
      {bubbleText && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            background: "rgba(30, 30, 36, 0.95)",
            border: "1px solid rgba(48, 48, 59, 0.8)",
            borderRadius: "10px",
            padding: "4px 8px",
            color: "#e3e3e8",
            fontSize: "11px",
            fontWeight: "500",
            textAlign: "center",
            maxWidth: "130px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            animation: "fadeIn 0.2s ease-out",
            zIndex: 10,
            pointerEvents: "none",
            direction: locale.startsWith("ar") ? "rtl" : "ltr",
          }}
        >
          {bubbleText}
          <div
            style={{
              position: "absolute",
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: "6px",
              height: "6px",
              background: "rgba(30, 30, 36, 0.95)",
              borderRight: "1px solid rgba(48, 48, 59, 0.8)",
              borderBottom: "1px solid rgba(48, 48, 59, 0.8)",
            }}
          />
        </div>
      )}

      {/* Pet Sprite */}
      <div
        style={{
          width: "80px",
          height: "80px",
          marginBottom: "15px",
        }}
      >
        <PetSprite
          type={petType}
          tiltX={tilt.x}
          tiltY={tilt.y}
          facing={facing}
          isWalking={isWalking}
        />
      </div>
    </div>
  );
}
