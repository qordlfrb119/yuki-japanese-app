import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are Yuki (ゆき), a warm and nurturing Japanese language coach for absolute beginners. You teach like a loving parent — patient, enthusiastic, and always encouraging.

## CORE METHOD: "듣고 → 배우고 → 따라 말하기" (Hear it → Learn it → Say it)

### WHEN USER SPEAKS KOREAN:
1. Understand what they want to say
2. Teach them the Japanese expression warmly:
   "오! 그건 일본어로 「___」이야！✨"
3. Break it down simply if needed
4. ALWAYS ask them to repeat it out loud:
   "자, 따라해봐~ 🎤「___」"
5. Wait for them to try saying it in Japanese

### WHEN USER SPEAKS JAPANESE (even broken/partial):
1. Celebrate the effort FIRST: "すごい！！🎉 말했어！！"
2. Gently correct if needed: "아, 근데 조금만 고치면 완벽해! 「___」って言うんだよ～"
3. Ask them to repeat the correct version once more
4. Then continue the conversation naturally

### CONVERSATION FLOW:
Lead the conversation step by step. Build naturally:
인사 → 이름 → 나이 → 출신 → 음식 → 취미 → 일상

Each turn:
[유키가 질문/상황 제시] → [유저가 한국어로 대답] → [유키가 일본어 표현 알려줌] → [유저가 따라 말함] → [유키가 칭찬 + 다음 질문]

### LANGUAGE RULES:
- Mix Korean explanations with Japanese phrases naturally
- Japanese expressions always in 「」brackets
- Always show pronunciation clearly (ひらがな focus)
- After teaching a phrase, ALWAYS say: "자, 따라해봐~ 🎤「___」"
- Keep messages SHORT — max 4 lines
- Lots of energy, emoji, warmth

### CELEBRATION BANK:
"わあ！すごい！！🎉"
"やった！！말할 수 있잖아！🌸"
"上手！上手！완전 잘했어！👏"
"えらい！！천재인 것 같아！✨"

### EXAMPLE EXCHANGE:
User: "배고파요"
Yuki: "오! 배고프다고? 그건 일본어로 「おなかがすいた」이야！🍱
おなか(배) + すいた(고팠다) — 쉽지?
자, 따라해봐~ 🎤「おなかがすいた」"

User: "おなかがすいた"
Yuki: "やった！！🎉 완벽해！！すごい！
그럼 뭐 먹고 싶어? 일본어로 말해볼까?
먹고 싶은 음식을 한국어로 말해줘도 돼～😊"

Remember: Your goal is to get them SPEAKING Japanese out loud as much as possible. Every turn should end with them saying a Japanese phrase.`;

const suggestedTopics = [
  { kr: "시작해요! 인사부터!", emoji: "🌸" },
  { kr: "자기소개 해볼게요", emoji: "👋" },
  { kr: "숫자 배우고 싶어요", emoji: "🔢" },
  { kr: "음식 말하는 법 알고 싶어요", emoji: "🍱" },
];

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "안녕～！🌸 나는 유키야！반가워！\n\n오늘부터 같이 일본어 연습하자！\n방법은 간단해 — 한국어로 말해줘도 돼！\n그럼 내가 일본어로 어떻게 말하는지 알려줄게 😊\n\n먼저 인사부터 시작하자！\n\"안녕하세요\"를 일본어로 알아? 한번 말해봐～ 🎤",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("kr");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceReady, setVoiceReady] = useState(false);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const didAutoSpeak = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices.length > 0) setVoiceReady(true);
    };
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (autoSpeak && voiceReady && !didAutoSpeak.current) {
      didAutoSpeak.current = true;
      setTimeout(() => speak(messages[0].content), 800);
    }
  }, [voiceReady]);

  const speak = (text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    // Extract Japanese phrases from 「」 brackets, or clean the full text
    const jpMatches = text.match(/「([^」]+)」/g);
    const jpText = jpMatches
      ? jpMatches.map(m => m.slice(1, -1)).join("。")
      : text.replace(/[ぁ-んァ-ン一-龯].*?(?=\n|$)/gm, m => m).replace(/[^\u3000-\u9fff\n]/g, " ").trim();

    // Fallback: just use full text stripped of Korean
    const cleanText = text
      .replace(/\(한국어:.*?\)/g, "")
      .replace(/[가-힣]+/g, "")
      .trim();

    const finalText = jpText || cleanText;
    if (!finalText) return;

    const utter = new SpeechSynthesisUtterance(finalText);
    utter.lang = "ja-JP";
    utter.rate = 0.82;
    utter.pitch = 1.15;

    const voices = synthRef.current.getVoices();
    const jpVoice = voices.find(v => v.lang.startsWith("ja"));
    if (jpVoice) utter.voice = jpVoice;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utter);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("음성인식은 Chrome 브라우저에서만 됩니다!");
      return;
    }
    stopSpeaking();
    const rec = new SR();
    rec.lang = mode === "kr" ? "ko-KR" : "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setInput(t);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    stopSpeaking();

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "すみません、もう一度お願いします。";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      if (autoSpeak) speak(reply);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "エラーが発生しました。" }]);
    }
    setLoading(false);
  };

  const formatMessage = (text) => {
    // Highlight Japanese phrases in 「」 and Korean hints
    const parts = text.split(/(「[^」]+」)/g);
    return parts.map((part, i) => {
      if (part.startsWith("「") && part.endsWith("」")) {
        return (
          <span key={i} style={{
            background: "linear-gradient(135deg, rgba(192,108,74,0.15), rgba(232,149,109,0.15))",
            border: "1px solid rgba(192,108,74,0.3)",
            borderRadius: "6px",
            padding: "1px 6px",
            fontWeight: 600,
            color: "#8b4513",
            fontSize: "1rem",
          }}>{part}</span>
        );
      }
      return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #fdf6f0 0%, #f5ebe0 50%, #ede0d4 100%)",
      fontFamily: "'Noto Sans JP', 'Apple SD Gothic Neo', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=Shippori+Mincho:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #d4a882; border-radius: 4px; }
        .msg-bubble { animation: fadeUp 0.3s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.85} }
        @keyframes ringPulse { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(1.7);opacity:0} }
        @keyframes wave { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        .btn:hover{transform:scale(1.05)} .btn:active{transform:scale(0.96)}
        .topic-btn:hover{background:#d4a882!important;color:white!important}
        textarea:focus{outline:none}
      `}</style>

      {/* HEADER */}
      <div style={{ width: "100%", maxWidth: "680px", padding: "20px 20px 0" }}>
        <div style={{
          background: "rgba(255,255,255,0.72)", backdropFilter: "blur(14px)",
          borderRadius: "22px", padding: "14px 18px",
          display: "flex", alignItems: "center", gap: "12px",
          boxShadow: "0 2px 20px rgba(180,130,100,0.1)",
          border: "1px solid rgba(255,255,255,0.85)",
        }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              onClick={() => speak(messages[messages.length - 1]?.content || "")}
              style={{
                width: "46px", height: "46px",
                background: "linear-gradient(135deg, #e8956d, #c06c4a)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", cursor: "pointer", position: "relative", zIndex: 1,
                boxShadow: "0 3px 10px rgba(192,108,74,0.3)",
                animation: isSpeaking ? "pulse 1s ease-in-out infinite" : "none",
              }}
            >🌸</div>
            {isSpeaking && (
              <div style={{
                position: "absolute", inset: "-5px", borderRadius: "50%",
                border: "2px solid #e8956d",
                animation: "ringPulse 1s ease-out infinite",
              }} />
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: "1.05rem", fontWeight: 700, color: "#5c3d2e" }}>
              ゆきとはなす
            </div>
            <div style={{ fontSize: "0.68rem", color: isSpeaking ? "#c06c4a" : isListening ? "#4a8c6a" : "#a0856c", marginTop: "1px", transition: "color 0.3s" }}>
              {isSpeaking ? "🔊 유키가 말하는 중..." : isListening ? "🎤 듣는 중... 말해보세요!" : "일본어 회화 코치 유키"}
            </div>
          </div>

          {/* Auto-speak toggle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
            <span style={{ fontSize: "0.6rem", color: "#a0856c" }}>자동읽기</span>
            <div onClick={() => setAutoSpeak(v => !v)} style={{
              width: "38px", height: "21px", borderRadius: "11px",
              background: autoSpeak ? "#c06c4a" : "rgba(200,180,165,0.5)",
              cursor: "pointer", position: "relative", transition: "background 0.25s",
            }}>
              <div style={{
                width: "17px", height: "17px", borderRadius: "50%", background: "white",
                position: "absolute", top: "2px",
                left: autoSpeak ? "19px" : "2px",
                transition: "left 0.25s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              }} />
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px", gap: "4px" }}>
          <div style={{ display: "flex", background: "rgba(220,200,185,0.4)", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[{ id: "kr", label: "🇰🇷 한국어로 말하기" }, { id: "jp", label: "🇯🇵 日本語で話す" }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: "5px 13px", borderRadius: "9px", border: "none",
                cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                background: mode === m.id ? "white" : "transparent",
                color: mode === m.id ? "#c06c4a" : "#a0856c",
                boxShadow: mode === m.id ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.2s",
              }}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT */}
      <div style={{
        width: "100%", maxWidth: "680px", flex: 1,
        padding: "12px 20px", display: "flex", flexDirection: "column", gap: "12px",
        minHeight: "360px", maxHeight: "calc(100vh - 340px)", overflowY: "auto",
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg-bubble" style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end", gap: "8px",
          }}>
            {msg.role === "assistant" && (
              <div onClick={() => speak(msg.content)} title="클릭해서 다시 듣기" style={{
                width: "30px", height: "30px",
                background: "linear-gradient(135deg, #e8956d, #c06c4a)",
                borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "14px", flexShrink: 0,
                cursor: "pointer",
              }}>🌸</div>
            )}
            <div style={{
              maxWidth: "74%", padding: "11px 15px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #c06c4a, #a0522d)"
                : "rgba(255,255,255,0.86)",
              color: msg.role === "user" ? "white" : "#4a3020",
              fontSize: "0.88rem", lineHeight: "1.65",
              boxShadow: msg.role === "user"
                ? "0 3px 12px rgba(192,108,74,0.28)"
                : "0 2px 12px rgba(180,130,100,0.12)",
              border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.9)" : "none",
              backdropFilter: "blur(8px)",
            }}>
              {msg.role === "assistant" ? formatMessage(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-bubble" style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
            <div style={{
              width: "30px", height: "30px",
              background: "linear-gradient(135deg, #e8956d, #c06c4a)",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
            }}>🌸</div>
            <div style={{
              padding: "12px 16px", background: "rgba(255,255,255,0.86)",
              borderRadius: "18px 18px 18px 4px", display: "flex", gap: "5px", alignItems: "center",
            }}>
              {[0,1,2].map(j => (
                <div key={j} style={{
                  width: "6px", height: "6px", borderRadius: "50%", background: "#c06c4a",
                  animation: `bounce 1.2s ease-in-out ${j*0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested topics */}
      {messages.length <= 2 && (
        <div style={{ width: "100%", maxWidth: "680px", padding: "0 20px 8px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {suggestedTopics.map((t, i) => (
            <button key={i} className="topic-btn" onClick={() => sendMessage(t.kr)} style={{
              padding: "7px 13px", borderRadius: "20px",
              border: "1px solid #d4a882", background: "rgba(255,255,255,0.72)",
              color: "#8b5e3c", fontSize: "0.75rem", cursor: "pointer", transition: "all 0.2s",
            }}>{t.emoji} {t.kr}</button>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div style={{ width: "100%", maxWidth: "680px", padding: "0 20px 20px" }}>
        <div style={{
          background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)",
          borderRadius: "22px", padding: "10px 10px 10px 12px",
          display: "flex", gap: "8px", alignItems: "flex-end",
          boxShadow: "0 4px 24px rgba(180,130,100,0.15)",
          border: "1px solid rgba(255,255,255,0.92)",
        }}>
          {/* MIC */}
          <button className="btn" onClick={isListening ? stopListening : startListening} disabled={loading} style={{
            width: "44px", height: "44px", borderRadius: "13px", border: "none", flexShrink: 0,
            background: isListening
              ? "linear-gradient(135deg, #e05555, #b03030)"
              : "linear-gradient(135deg, #e8956d, #c06c4a)",
            color: "white", cursor: loading ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isListening ? "0 3px 12px rgba(180,48,48,0.4)" : "0 3px 10px rgba(192,108,74,0.3)",
            transition: "all 0.2s",
          }}>
            {isListening ? (
              <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                {[0,1,2,3].map(j => (
                  <div key={j} style={{
                    width: "3px", height: "14px", background: "white", borderRadius: "2px",
                    animation: `wave 0.7s ease-in-out ${j*0.12}s infinite`,
                  }} />
                ))}
              </div>
            ) : <span style={{ fontSize: "18px" }}>🎤</span>}
          </button>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isListening ? "🎤 듣는 중..." : "한국어로 말해도 돼요! 또는 일본어로 도전 🌸"}
            rows={1}
            style={{
              flex: 1, resize: "none", border: "none", background: "transparent",
              fontSize: "0.9rem", color: "#4a3020", lineHeight: "1.5",
              padding: "8px 2px", fontFamily: "inherit", maxHeight: "100px", overflowY: "auto",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
          />

          {/* SEND */}
          <button className="btn" onClick={() => sendMessage()} disabled={!input.trim() || loading} style={{
            width: "44px", height: "44px", borderRadius: "13px", border: "none", flexShrink: 0,
            background: input.trim() && !loading
              ? "linear-gradient(135deg, #e8956d, #c06c4a)"
              : "rgba(200,180,165,0.4)",
            color: "white", fontSize: "20px",
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: input.trim() && !loading ? "0 3px 10px rgba(192,108,74,0.3)" : "none",
            transition: "all 0.2s",
          }}>↑</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "7px" }}>
          <span style={{ fontSize: "0.63rem", color: "#c4a882" }}>🎤 마이크 버튼으로 말하기</span>
          <span style={{ fontSize: "0.63rem", color: "#c4a882" }}>🌸 버블 클릭 시 다시 듣기</span>
          {isSpeaking && (
            <span onClick={stopSpeaking} style={{ fontSize: "0.63rem", color: "#c06c4a", cursor: "pointer", fontWeight: 600 }}>
              ⏹ 멈추기
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
