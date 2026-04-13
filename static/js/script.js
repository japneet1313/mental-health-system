document.addEventListener("DOMContentLoaded", function(){

    const surveyBtn = document.getElementById("surveyBtn");
    const overlay = document.getElementById("overlay");
    const guardianFormContainer = document.getElementById("guardianFormContainer");
    const stressScore = document.getElementById("stressScore");
    const stressStatus = document.getElementById("stressStatus");
    const chartCanvas = document.getElementById("stressChart");

    // Voice default
    if (sessionStorage.getItem("voiceEnabled") === null) {
        sessionStorage.setItem("voiceEnabled", "true");
    }
    updateVoiceButton();

    // Guardian check
    if (surveyBtn && sessionStorage.getItem("guardian") === "yes") {
        if (overlay) overlay.style.display = "none";
        if (guardianFormContainer) guardianFormContainer.style.display = "none";
        surveyBtn.disabled = false;
    }

    // Load stress score + chart
    if (stressScore && stressStatus && chartCanvas) {

        let score = parseInt(localStorage.getItem("stressScore")) || 0;
        stressScore.innerText = score;

        let status = score > 44 ? "High" : score > 25 ? "Moderate" : "Low";
        stressStatus.innerText = status;

        // Add color class
        stressStatus.classList.remove("low", "moderate", "high");
        stressStatus.classList.add(status.toLowerCase());

        // 🎯 INTERACTIVE CHART
        new Chart(chartCanvas, {
            type: "doughnut",
            data: {
                labels: ["Stress", "Stress-Free"],
                datasets: [{
                    data: [score, Math.max(64 - score, 0)],
                    backgroundColor: ["#ef476f", "#06d6a0"]
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: "top"
                    }
                },

                onClick: function(evt, elements){
                    if(elements.length > 0){

                        let index = elements[0].index;

                        // 🔴 STRESS PART CLICKED
                        if(index === 0){

                            if(score <= 25){
                                alert(
`🟢 LOW STRESS

Symptoms:
• Mild tiredness
• Occasional distraction
• Normal mood swings

Suggestion:
Maintain routine, stay active, and keep a positive mindset.`
                                );
                            }

                            else if(score <= 44){
                                alert(
`🟡 MODERATE STRESS

Symptoms:
• Frequent overthinking
• Difficulty focusing
• Sleep disturbances
• Feeling overwhelmed

Suggestion:
Take breaks, try meditation, talk to someone you trust.`
                                );
                            }

                            else{
                                alert(
`🔴 HIGH STRESS

Symptoms:
• Anxiety or panic
• Emotional exhaustion
• Lack of motivation
• Social withdrawal
• Continuous negative thoughts

Suggestion:
Please talk to a guardian or counselor immediately.`
                                );
                            }
                        }

                        // 🟢 STRESS-FREE PART
                        else{
                            alert(
`🌿 STRESS-FREE STATE

Meaning:
• You are maintaining good mental balance
• Emotional stability is strong

Keep doing:
• Healthy routine
• Proper sleep
• Positive thinking`
                            );
                        }
                    }
                }
            }
        });
    }

});


// ===================== GUARDIAN =====================

function saveGuardian(){
    let name = document.getElementById("guardianName").value.trim();
    let email = document.getElementById("guardianEmail").value.trim();
    let phone = document.getElementById("guardianPhone").value.trim();

    if(name === "" || email === ""){
        alert("Please fill all guardian details!");
        return;
    }

    sessionStorage.setItem("guardian", "yes");
    sessionStorage.setItem("guardianName", name);
    sessionStorage.setItem("guardianEmail", email);
    sessionStorage.setItem("guardianPhone", phone);

    document.getElementById("overlay").style.display = "none";
    document.getElementById("guardianFormContainer").style.display = "none";
    document.getElementById("surveyBtn").disabled = false;
}


// ===================== NAVIGATION =====================

function goToSurvey(){
    if(sessionStorage.getItem("guardian") !== "yes"){
        alert("Fill guardian details first");
        return;
    }
    window.location.href = "/survey";
}


// ===================== CHATBOT =====================

function toggleChat(){
    let box = document.getElementById("chatBox");
    box.style.display = box.style.display === "block" ? "none" : "block";
}

function sendMessage(){
    let msg = document.getElementById("userInput").value.trim();
    if(!msg) return;

    addMessage(msg, "user");
    document.getElementById("userInput").value = "";

    fetch("/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: msg })
    })
    .then(response => response.json())
    .then(data => {
        typeMessage(data.reply);

        // 🔊 Speak if enabled
        if (sessionStorage.getItem("voiceEnabled") === "true") {
            speak(data.reply);
        }
    })
    .catch(() => {
        const fallback = "I’m here for you. Please try again.";
        typeMessage(fallback);

        if (sessionStorage.getItem("voiceEnabled") === "true") {
            speak(fallback);
        }
    });
}

function handleKey(e){
    if(e.key === "Enter") sendMessage();
}


// ===================== DISPLAY =====================

function addMessage(text, type){
    let d = document.createElement("div");
    d.className = type;
    d.innerText = text;
    document.getElementById("messages").appendChild(d);
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}

function typeMessage(text){
    let d = document.createElement("div");
    d.className = "bot";
    d.innerText = text;
    document.getElementById("messages").appendChild(d);
    document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;
}


// ===================== VOICE =====================

function toggleVoice(){
    let current = sessionStorage.getItem("voiceEnabled") === "true";
    sessionStorage.setItem("voiceEnabled", (!current).toString());
    updateVoiceButton();

    // Stop speaking if turned OFF
    if (current) {
        window.speechSynthesis.cancel();
    }
}

function updateVoiceButton(){
    const btn = document.getElementById("voiceToggleBtn");
    if (!btn) return;

    btn.innerText = sessionStorage.getItem("voiceEnabled") === "true" ? "🔊" : "🔇";
}


// ===================== SPEAK =====================

function speak(text){
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    let cleanText = text.replace(/[^\w\s.,!?'-]/g, " ");
    let speech = new SpeechSynthesisUtterance(cleanText);

    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
}