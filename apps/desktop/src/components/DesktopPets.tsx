import { useState, useEffect } from "react";

export interface Pet {
  id: string;
  type: "robot" | "cat";
  name: string;
  x: number; // percentage 5 - 90
  y: number; // percentage 10 - 85
  facing: "left" | "right";
  isJumping: boolean;
  bubbleText: string | null;
}

interface DesktopPetsProps {
  isAgentRunning: boolean;
  isTaskRunning: boolean;
  locale?: string;
  pets: Pet[];
  onUpdatePets: React.Dispatch<React.SetStateAction<Pet[]>>;
}

const ROBOT_NAMES = ["AuraBot", "GemmaBot", "TauriBot", "PixelBot", "Cody", "Byte"];
const CAT_NAMES = ["RustCat", "OllamaCat", "Mochi", "Neko", "PixelCat", "Simba"];

const IDLE_BUBBLES_EN = [
  "No bugs, only features! 🐛",
  "Did you save your keys? 🔑",
  "LM Studio is active! 💻",
  "Let's code something awesome! 🚀",
  "Clean code = happy dev! ✨",
  "I'm watching your mouse... 👀",
  "Aura Work is so cool! 💖",
  "Need some help? Ask me! 🤖",
  "Tauri + React = Speed! ⚡",
];

const IDLE_BUBBLES_AR = [
  "لا توجد أخطاء، هذه ميزات إضافية! 🐛",
  "هل حفظت مفاتيح النماذج؟ 🔑",
  "LM Studio يعمل وجاهز! 💻",
  "دعنا نكتب كوداً رائعاً! 🚀",
  "كود نظيف = مبرمج سعيد! ✨",
  "أنا أراقب الماوس... 👀",
  "تطبيق أورا ورك رائع جداً! 💖",
  "هل تحتاج مساعدة؟ اسألني! 🤖",
  "تاوري + ريأكت = سرعة فائقة! ⚡",
];

const WORK_BUBBLES_EN = [
  "Scanning the code... 🔍",
  "Thinking... 🧠",
  "Writing code files... 💾",
  "Designing the UI... 🎨",
  "Running compiler build... ⚙️",
  "Working hard on the files! 🛠️",
];

const WORK_BUBBLES_AR = [
  "أقوم بفحص الكود... 🔍",
  "أفكر في الحل... 🧠",
  "كتابة الملفات البرمجية... 💾",
  "تنسيق وتجميل الواجهة... 🎨",
  "جاري تشغيل بناء الكود... ⚙️",
  "أعمل بجد على الملفات! 🛠️",
];

const CLICK_BUBBLES_EN = ["Wheee! 😄", "Hello there! 👋", "Just wandering! 🐾", "This is fun! 🎉", "Meow! 🐱", "Beep boop! 🤖"];
const CLICK_BUBBLES_AR = ["ياي! 😄", "أهلاً بك! 👋", "أنا أتمشى هنا! 🐾", "هذا ممتع! 🎉", "مياو! 🐱", "بيب بوب! 🤖"];

export function spawnNewPet(type?: "robot" | "cat"): Pet {
  const finalType = type || (Math.random() > 0.5 ? "robot" : "cat");
  const names = finalType === "robot" ? ROBOT_NAMES : CAT_NAMES;
  const name = names[Math.floor(Math.random() * names.length)] + ` #${Math.floor(Math.random() * 100)}`;
  
  return {
    id: Math.random().toString(36).substring(2, 9),
    type: finalType,
    name,
    x: 15 + Math.random() * 70, // 15% - 85%
    y: 60 + Math.random() * 25, // bottom area: 60% - 85%
    facing: Math.random() > 0.5 ? "left" : "right",
    isJumping: false,
    bubbleText: null,
  };
}

function removeImageBackground(imgUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imgUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      const bgR = data[0];
      const bgG = data[1];
      const bgB = data[2];
      
      const threshold = 60;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const dist = Math.sqrt(
          (r - bgR) ** 2 +
          (g - bgG) ** 2 +
          (b - bgB) ** 2
        );
        
        if (dist < threshold) {
          data[i + 3] = 0;
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => {
      resolve(imgUrl);
    };
    img.src = imgUrl;
  });
}

export function DesktopPets({ isAgentRunning, isTaskRunning, locale, pets, onUpdatePets }: DesktopPetsProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [processedImages, setProcessedImages] = useState<Record<string, string>>({});
  const isAr = locale?.startsWith("ar");

  useEffect(() => {
    const urls = ["/cute_robot_pet.png", "/cute_cat_pet.png"];
    urls.forEach((url) => {
      if (!processedImages[url]) {
        void removeImageBackground(url).then((dataUrl) => {
          setProcessedImages((prev) => ({ ...prev, [url]: dataUrl }));
        });
      }
    });
  }, []);

  // Track global mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Update speech bubbles when agent/task state changes
  useEffect(() => {
    if (isAgentRunning || isTaskRunning) {
      const workList = isAr ? WORK_BUBBLES_AR : WORK_BUBBLES_EN;
      onUpdatePets((prevPets) =>
        prevPets.map((p) => {
          const randText = workList[Math.floor(Math.random() * workList.length)];
          return {
            ...p,
            bubbleText: randText,
          };
        })
      );
    } else {
      // Clear work messages after a short delay
      setTimeout(() => {
        onUpdatePets((prevPets) =>
          prevPets.map((p) => ({
            ...p,
            bubbleText: null,
          }))
        );
      }, 3000);
    }
  }, [isAgentRunning, isTaskRunning, isAr, onUpdatePets]);

  // Wandering and periodic random bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      onUpdatePets((prevPets) =>
        prevPets.map((p) => {
          // 1. Move decision (50% chance to walk)
          let nextX = p.x;
          let nextY = p.y;
          let nextFacing = p.facing;
          if (Math.random() > 0.5) {
            nextX = Math.max(5, Math.min(95, p.x + (Math.random() * 30 - 15)));
            nextY = Math.max(20, Math.min(88, p.y + (Math.random() * 20 - 10)));
            nextFacing = nextX > p.x ? "right" : "left";
          }

          // 2. Idle speech bubble decision (25% chance if app is idle)
          let nextBubbleText = p.bubbleText;
          if (!isAgentRunning && !isTaskRunning && Math.random() > 0.75 && !p.bubbleText) {
            const idleList = isAr ? IDLE_BUBBLES_AR : IDLE_BUBBLES_EN;
            nextBubbleText = idleList[Math.floor(Math.random() * idleList.length)];
            
            // Auto hide this bubble after 4 seconds
            setTimeout(() => {
              onUpdatePets((currPets) =>
                currPets.map((currP) => (currP.id === p.id ? { ...currP, bubbleText: null } : currP))
              );
            }, 4000);
          }

          return {
            ...p,
            x: nextX,
            y: nextY,
            facing: nextFacing,
            bubbleText: nextBubbleText,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isAgentRunning, isTaskRunning, isAr, onUpdatePets]);

  const handlePetClick = (id: string) => {
    const clickList = isAr ? CLICK_BUBBLES_AR : CLICK_BUBBLES_EN;
    onUpdatePets((prevPets) =>
      prevPets.map((p) => {
        if (p.id === id) {
          const randText = clickList[Math.floor(Math.random() * clickList.length)];
          setTimeout(() => {
            onUpdatePets((currPets) =>
              currPets.map((currP) => (currP.id === id ? { ...currP, isJumping: false, bubbleText: null } : currP))
            );
          }, 4000);
          return {
            ...p,
            isJumping: true,
            bubbleText: randText,
          };
        }
        return p;
      })
    );
  };

  return (
    <div className="desktop-pets-overlay" style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 9999 }}>
      {pets.map((pet) => {
        // Calculate tilt direction towards mouse
        const petXPixels = (pet.x / 100) * window.innerWidth;
        const petYPixels = (pet.y / 100) * window.innerHeight;
        const dx = mousePos.x - petXPixels;
        const dy = mousePos.y - petYPixels;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Tilt amount: move head elements slightly towards mouse
        const tiltX = Math.cos(angle) * Math.min(6, dist / 20) + (pet.facing === "left" ? -2 : 2);
        const tiltY = Math.sin(angle) * Math.min(4, dist / 20) - 2;

        const imgPath = pet.type === "robot" ? "/cute_robot_pet.png" : "/cute_cat_pet.png";

        return (
          <div
            key={pet.id}
            className={`pet-container ${pet.isJumping ? "jump" : ""}`}
            style={{
              position: "absolute",
              left: `${pet.x}%`,
              top: `${pet.y}%`,
              transform: "translate(-50%, -100%)",
              transition: "left 3.5s ease-in-out, top 3.5s ease-in-out",
              pointerEvents: "auto",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 9999,
              userSelect: "none",
            }}
            onClick={() => handlePetClick(pet.id)}
          >
            {/* Speech bubble */}
            {pet.bubbleText && (
              <div
                className="pet-speech-bubble"
                style={{
                  background: "var(--bg-2, #1e1e24)",
                  border: "1px solid var(--border-2, #30303b)",
                  borderRadius: "12px",
                  padding: "6px 12px",
                  boxShadow: "var(--shadow-2)",
                  color: "var(--fg-1, #e3e3e8)",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  marginBottom: "8px",
                  position: "relative",
                  animation: "fadeIn 0.2s ease-out",
                  pointerEvents: "none",
                }}
              >
                {pet.bubbleText}
                <div
                  className="bubble-arrow"
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    left: "50%",
                    transform: "translateX(-50%) rotate(45deg)",
                    width: "8px",
                    height: "8px",
                    background: "var(--bg-2, #1e1e24)",
                    borderRight: "1px solid var(--border-2, #30303b)",
                    borderBottom: "1px solid var(--border-2, #30303b)",
                  }}
                />
              </div>
            )}

            {/* Pet body with head tracking mouse */}
            <div
              className="pet-wrapper"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `scaleX(${pet.facing === "left" ? 1 : -1})`,
                transition: "transform 0.3s ease-in-out",
              }}
            >
              {/* Head tracking element */}
              <div
                className="pet-character"
                style={{
                  transform: `translate(${tiltX}px, ${tiltY}px)`,
                  transition: "transform 0.1s ease-out",
                  width: "56px",
                  height: "56px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={processedImages[imgPath] || imgPath}
                  alt={pet.name}
                  className="pet-image"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <span
                className="pet-label"
                style={{
                  font: "var(--text-caption)",
                  fontSize: "9px",
                  color: "var(--fg-3, #8e8e93)",
                  background: "var(--bg-3, #16161a)",
                  padding: "1px 4px",
                  borderRadius: "4px",
                  marginTop: "2px",
                  transform: `scaleX(${pet.facing === "left" ? 1 : -1})`, // keep label text un-flipped
                }}
              >
                {pet.name.split(" ")[0]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
