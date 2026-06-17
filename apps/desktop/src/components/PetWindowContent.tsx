import { useEffect, useState, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { PetSprite } from "./PetSprites";

interface PetWindowContentProps {
  initialType?: string;
}

const BUBBLES_EN = [
  "Checking for clean code...",
  "Standing by for the next task.",
  "Need a break? Stretch a bit.",
  "Code compiles. Time for a pause.",
  "No warnings found.",
  "Keeping the workspace ready.",
  "Watching helper services.",
  "Tests make releases calmer.",
  "Is the backend running?",
  "Let's build something polished.",
];

const BUBBLES_AR = [
  "أتحقق من نظافة الكود...",
  "جاهز للمهمة التالية.",
  "هل تحتاج استراحة؟ تمدد قليلاً.",
  "الكود يعمل بنجاح. وقت توقف قصير.",
  "لا توجد تحذيرات.",
  "أحافظ على جاهزية مساحة العمل.",
  "أراقب خدمات المساعدة.",
  "الاختبارات تجعل الإصدارات أهدأ.",
  "هل الخادم يعمل؟",
  "دعنا نبني شيئاً متقناً.",
];

export function PetWindowContent({ initialType = "robot" }: PetWindowContentProps) {
  const [petType, setPetType] = useState<string>(initialType);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [facing, setFacing] = useState<"left" | "right">("left");
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [locale, setLocale] = useState<string>("en");
  const isWindows = typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);

  // Keep track of actual window position
  const positionRef = useRef({ x: 400, y: 400 });
  const targetRef = useRef({ x: 400, y: 400 });
  const lastInteractionRef = useRef<number>(Date.now());
  const nextWalkTimeRef = useRef<number>(Date.now() + 3000);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldSyncPositionRef = useRef<boolean>(true);

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

  // Force transparent backgrounds
  useEffect(() => {
    const bg = isWindows ? "#15110f" : "transparent";
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    const root = document.getElementById("root");
    if (root) {
      root.style.background = bg;
    }
  }, [isWindows]);

  // Sync starting position
  const syncPosition = async () => {
    try {
      const appWindow = getCurrentWindow() as any;
      const actualPos = await appWindow.outerPosition();
      const monitor = await appWindow.currentMonitor();
      if (monitor) {
        const scaleFactor = monitor.scaleFactor || 1;
        const logicalX = actualPos.x / scaleFactor;
        const logicalY = actualPos.y / scaleFactor;
        positionRef.current = { x: logicalX, y: logicalY };
        targetRef.current = { x: logicalX, y: logicalY };
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

  // Smooth walking animation loop with recursive setTimeout to avoid queue buildup on Windows
  useEffect(() => {
    const tickMs = isWindows ? 180 : 100;
    const speed = isWindows ? 7.2 : 4.2;
    let timeoutId: NodeJS.Timeout | null = null;
    let active = true;

    const tick = async () => {
      if (!active) return;

      // If there was a recent user interaction (drag/click), pause walking
      if (Date.now() - lastInteractionRef.current < 6000) {
        setIsWalking(false);
        shouldSyncPositionRef.current = true;
        timeoutId = setTimeout(tick, tickMs);
        return;
      }

      if (shouldSyncPositionRef.current) {
        shouldSyncPositionRef.current = false;
        await syncPosition();
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
      
      // Schedule next tick only after current work finishes
      timeoutId = setTimeout(tick, tickMs);
    };

    // Start loop
    timeoutId = setTimeout(tick, tickMs);

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [bubbleText, isWindows, locale]);

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

  // Handle Dragging using native Tauri startDragging
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    lastInteractionRef.current = Date.now();
    setTilt({ x: 0, y: 0 });

    try {
      const appWindow = getCurrentWindow() as any;
      await appWindow.startDragging();
    } catch (err) {
      console.error("Failed to start native dragging:", err);
    }
  };

  const handleTouchStart = async () => {
    lastInteractionRef.current = Date.now();
    setTilt({ x: 0, y: 0 });

    try {
      const appWindow = getCurrentWindow() as any;
      await appWindow.startDragging();
    } catch (err) {
      console.error("Failed to start native dragging for touch:", err);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        width: "150px",
        height: "150px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        overflow: "hidden",
        background: isWindows ? "#15110f" : "transparent",
        borderRadius: isWindows ? "18px" : undefined,
        boxShadow: isWindows ? "0 10px 28px rgba(0,0,0,0.35)" : undefined,
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
