// =========================
// GLOBAL VARIABLES
// =========================
let currentQuestions = {};
let questionKeys = [];
let currentQuestionIndex = 0;
let score = 0;
let blinkLock = false;


// =========================
// NAVIGATION
// =========================
function goRegister() {
    window.location.href = "register.html";
}

function goLogin() {
    window.location.href = "game.html";
}


// =========================
// REGISTER FUNCTION
// =========================
function register() {

    let statusText = document.getElementById("statusText");
    statusText.innerText = "Registering...";

    let video = document.getElementById("video");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;

            setTimeout(() => {

                let canvas = document.createElement("canvas");
                canvas.width = 640;
                canvas.height = 480;

                let ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0);

                fetch("http://127.0.0.1:5000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username.value,
                        color: color.value,
                        pet: pet.value,
                        number: number.value,
                        hobby: hobby.value,
                        flower: flower.value,
                        image: canvas.toDataURL()
                    })
                })
                    .then(res => res.json())
                    .then(data => {

                        if (data.status === "registered") {
                            statusText.innerText = "✅ Face Registered Successfully!";
                            alert("Registration Completed 🎉");
                        } else {
                            statusText.innerText = "❌ " + data.status;
                        }

                    });

            }, 1500);
        });
}


// =========================
// VERIFY FACE
// =========================
function verifyFace() {

    let statusText = document.getElementById("statusText");
    statusText.innerText = "Verifying Face...";

    let video = document.getElementById("video");

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;

            setTimeout(() => {

                let canvas = document.createElement("canvas");
                canvas.width = 640;
                canvas.height = 480;

                let ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0);

                fetch("http://127.0.0.1:5000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username.value,
                        image: canvas.toDataURL()
                    })
                })
                    .then(res => res.json())
                    .then(data => {

                        if (data.status === "face_verified") {

                            statusText.innerText = "✅ Face Verified! Starting Challenge...";

                            currentQuestions = data.questions;
                            startChallenge(currentQuestions);

                        } else {
                            statusText.innerText = "❌ Face Not Matched!";
                        }

                    });

            }, 1500);
        });
}


// =========================
// START 3 QUESTION CHALLENGE
// =========================
function startChallenge(questions) {

    questionKeys = Object.keys(questions)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    currentQuestionIndex = 0;
    score = 0;

    askNextQuestion(questions);
}


// =========================
// ASK QUESTION
// =========================
function askNextQuestion(questions) {

    if (currentQuestionIndex >= 3) {

        if (score === 3) {
            document.getElementById("statusText").innerText =
                "🎉 AUTHENTICATION SUCCESSFUL!";
        } else {
            document.getElementById("statusText").innerText =
                "❌ Authentication Failed!";
        }
        return;
    }

    let key = questionKeys[currentQuestionIndex];
    let correctAnswer = questions[key];

    document.getElementById("questionText").innerText =
        "Q" + (currentQuestionIndex + 1) + ": What is your " + key + "?";

    // Generate 3 random fake options
    let fakeOptions = generateOptions(correctAnswer).filter(opt => opt !== correctAnswer);

    // 4 slots (top, left, right, bottom)
    let slots = [null, null, null, null];

    // Pick random slot for correct answer
    let correctSlot = Math.floor(Math.random() * 4);
    slots[correctSlot] = correctAnswer;

    // Fill remaining slots with fake options
    let fakeIndex = 0;
    for (let i = 0; i < 4; i++) {
        if (slots[i] === null) {
            slots[i] = fakeOptions[fakeIndex];
            fakeIndex++;
        }
    }

    // Remove old options
    document.querySelectorAll(".option").forEach(el => el.remove());

    // Create options around video
    slots.forEach((opt, i) => {

        let div = document.createElement("div");
        div.className = "option";
        div.innerText = opt;
        div.dataset.correct = (opt === correctAnswer);

        // Position mapping
        if (i === 0) { div.style.gridColumn = "2"; div.style.gridRow = "1"; } // TOP
        if (i === 1) { div.style.gridColumn = "1"; div.style.gridRow = "2"; } // LEFT
        if (i === 2) { div.style.gridColumn = "3"; div.style.gridRow = "2"; } // RIGHT
        if (i === 3) { div.style.gridColumn = "2"; div.style.gridRow = "3"; } // BOTTOM

        document.getElementById("gameGrid").appendChild(div);
    });

    listenForHeadMovement(document.getElementById("gameGrid"), questions);
}


// =========================
// GENERATE OPTIONS
// =========================
function generateOptions(correct) {

    let randomWords = [
        "Red", "Blue", "Green", "Dog", "Cat",
        "5", "10", "Music", "Sports", "Rose", "Lily"
    ];

    let options = [correct];

    while (options.length < 4) {
        let random = randomWords[Math.floor(Math.random() * randomWords.length)];
        if (!options.includes(random)) {
            options.push(random);
        }
    }

    return options.sort(() => 0.5 - Math.random());
}


// =========================
// FACE MOVEMENT DETECTION
// =========================
function listenForHeadMovement(optionsDiv, questions) {

    const videoElement = document.getElementById("video");

    const faceMesh = new FaceMesh({
        locateFile: file =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    let selectionLocked = false;

    faceMesh.onResults(results => {

        if (!results.multiFaceLandmarks || selectionLocked) return;

        let landmarks = results.multiFaceLandmarks[0];

        let nose = landmarks[1];           // Nose tip
        let leftCheek = landmarks[234];    // Left side face
        let rightCheek = landmarks[454];   // Right side face

        let faceCenterX = (leftCheek.x + rightCheek.x) / 2;
        let horizontalMovement = nose.x - faceCenterX;

        let selectedIndex = null;

        // 👇 More realistic thresholds
        if (horizontalMovement > 0.05) selectedIndex = 3;      // Right
        else if (horizontalMovement < -0.05) selectedIndex = 2; // Left
        else if (nose.y < 0.40) selectedIndex = 0;              // Up
        else if (nose.y > 0.65) selectedIndex = 1;              // Down

        if (selectedIndex !== null) {

            selectionLocked = true;

            let option = optionsDiv.children[selectedIndex];

            if (option) {

                option.style.background = "#00ff99";

                if (option.dataset.correct === "true") {
                    score++;
                }

                currentQuestionIndex++;

                setTimeout(() => {
                    selectionLocked = false;
                    askNextQuestion(questions);
                }, 1200);
            }
        }
    });

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 400,
        height: 300
    });

    camera.start();
}