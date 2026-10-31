// ===== 1. API KEY (Safe: browser లో మాత్రమే) =====
let API_KEY = localStorage.getItem("renuka_key");
if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");
    if (API_KEY) localStorage.setItem("renuka_key", API_KEY);
}

// ===== 2. SMART MODELS (ఒకటి fail అయితే next auto try) =====
// PDF లో ఉన్న models కరెక్ట్ కాదు, కాబట్టి working models ఇక్కడ ఉన్నాయి
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro"];

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN (auto-fallback) =====
async function callGemini(p) {
    let lastErr;
    for (const m of MODELS) {
        try {
            const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + API_KEY, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] })
            });
            const data = await res.json();
            if (data.error) {
                lastErr = new Error(data.error.message);
                if (/high demand|temporar|quota|rate|unavailable|no longer available|deprecated/i.test(data.error.message)) continue;
                throw lastErr;
            }
            return data.candidates[0].content.parts[0].text;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

async function askGemini(p) {
    add('Renuka: Thinking...', 'ai');
    try {
        const reply = await callGemini(p);
        chat.lastChild.innerText = 'Renuka: ' + reply;
        speak(reply); // reply వచ్చిన వెంటనే VOICE
    } catch (e) {
        chat.lastChild.innerText = 'Renuka: ERROR - ' + e.message;
    }
}

// ===== 4. SPEECH RECOGNITION (వినడం) =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SR();
rec.lang = 'en-US'; // తెలుగు కోసం 'te-IN' గా మార్చండి
rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    add('YOU: ' + t, 'user');
    askGemini(t);
};
micBtn.onclick = () => { rec.start(); micBtn.innerText = '...'; };
rec.onend = () => { micBtn.innerText = '🎤'; };

// ===== 5. TEXT-TO-SPEECH (మాట్లాడటం) =====
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices(); }
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t) {
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 1.05;
    u.pitch = 0.85;
    const v = voices.find(v => v.lang.startsWith('en'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
}

// ===== 6. TEXT SEND BUTTON =====
document.getElementById('send').onclick = () => {
    const t = input.value.trim();
    if (!t) return;
    add('YOU: ' + t, 'user');
    input.value = "";
    askGemini(t);
};

// Helper function to add messages to screen
function add(t, w) {
    const d = document.createElement('div');
    d.className = 'msg ' + w;
    d.innerHTML = t;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}
