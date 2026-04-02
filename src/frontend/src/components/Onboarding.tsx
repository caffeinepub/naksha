import { type FC, useState } from "react";
import Starfield from "../components/Starfield";
import { setUsername } from "../utils/storage";

interface Props {
  onComplete: (name: string) => void;
}

const Onboarding: FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    onComplete(trimmed);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <Starfield />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "rgba(7,10,18,0.75)",
          backdropFilter: "blur(20px)",
          borderRadius: 28,
          padding: "36px 28px",
          width: "100%",
          maxWidth: 360,
          border: "1px solid rgba(53,189,243,0.25)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 12 }}>🧭</div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: "#fff",
            margin: "0 0 6px",
            letterSpacing: -1,
            textShadow: "0 0 24px rgba(53,189,243,0.6)",
          }}
        >
          Naksha
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#9EDCFF",
            margin: "0 0 32px",
            letterSpacing: 0.5,
          }}
        >
          Your Time. Your Orbit. 🪐
        </p>

        <p
          style={{
            fontSize: 16,
            color: "#B8CCDD",
            margin: "0 0 16px",
            fontWeight: 500,
          }}
        >
          What should we call you?
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your name..."
          style={{
            width: "100%",
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid rgba(53,189,243,0.3)",
            background: "rgba(255,255,255,0.07)",
            color: "#fff",
            fontSize: 16,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 16,
            textAlign: "center",
            caretColor: "#35BDF3",
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          style={{
            width: "100%",
            padding: "15px",
            borderRadius: 14,
            border: "none",
            background: name.trim()
              ? "linear-gradient(135deg, #35BDF3, #1AABEF)"
              : "rgba(53,189,243,0.25)",
            color: name.trim() ? "#fff" : "#5E7A8C",
            fontSize: 17,
            fontWeight: 800,
            cursor: name.trim() ? "pointer" : "default",
            boxShadow: name.trim() ? "0 6px 20px rgba(53,189,243,0.5)" : "none",
            transition: "all 0.2s",
            letterSpacing: 0.3,
          }}
        >
          Let’s Go →
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
