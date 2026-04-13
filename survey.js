document.addEventListener("DOMContentLoaded", function () {
    updateRiskometer();

    document.getElementById("surveyForm").addEventListener("submit", function(e) {
        e.preventDefault();

        let features = [];
        let total = 0;

        for (let i = 1; i <= 16; i++) {
            let input = document.getElementById("q" + i);

            if (!input || input.value === "") {
                alert("Please answer all questions!");
                return;
            }

            let value = parseInt(input.value);
            features.push(value);
            total += value;
        }

        localStorage.setItem("stressScore", total);

        fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                features: features
            })
        })
        .then(response => response.json())
        .then(data => {
            localStorage.setItem("riskLevel", data.risk_level);

            if (data.risk_level === "HIGH") {
                fetch("/send-alert", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        guardianEmail: sessionStorage.getItem("guardianEmail"),
                        guardianName: sessionStorage.getItem("guardianName"),
                        score: total
                    })
                })
                .then(res => res.json())
                .then(data => console.log("Email:", data))
                .catch(err => console.log("Email error:", err));
            }

            window.location.href = "/result";
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Something went wrong!");
        });
    });
});

function updateRiskometer() {
    let total = 0;
    let answered = 0;

    for (let i = 1; i <= 16; i++) {
        let input = document.getElementById("q" + i);
        if (input && input.value !== "") {
            total += parseInt(input.value);
            answered++;
        }
    }

    document.getElementById("liveScore").innerText = total;

    const percent = Math.min((total / 64) * 100, 100);
    document.getElementById("meterFill").style.width = percent + "%";

    let risk = "Low";
    let tip = "Current responses suggest a low risk level. Keep maintaining a healthy routine.";

    if (total > 44) {
        risk = "High";
        tip = "Current responses suggest high mental health risk. Extra support and early attention may be needed.";
    } else if (total > 25) {
        risk = "Moderate";
        tip = "Current responses suggest a moderate risk level. Stress management and support may help.";
    }

    if (answered === 0) {
        risk = "Low";
        tip = "Start answering the survey to see your live risk level.";
    }

    const riskLabel = document.getElementById("liveRiskLevel");
    riskLabel.innerText = risk;
    document.getElementById("liveTip").innerText = tip;

    if (risk === "Low") {
        riskLabel.style.color = "#2e8b57";
    } else if (risk === "Moderate") {
        riskLabel.style.color = "#d4a017";
    } else {
        riskLabel.style.color = "#d62828";
    }
}