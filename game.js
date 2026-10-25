// 1. ระบบเสียงเอฟเฟกต์ออนไลน์
const sndCorrect = new Audio("https://google.com");
const sndWrong = new Audio("https://google.com");
const sndWin = new Audio("https://google.com");

function playSound(audio) {
    audio.currentTime = 0;
    audio.play().catch(e => {});
}

// 2. ตั้งค่าการเชื่อมต่อ Google Firebase คีย์จริงจากโปรเจกต์ของคุณ
const firebaseConfig = {
    apiKey: "AIzaSyAsJ2uB1k7hO8M4N9vP3qR5sT6uV7wX8yZ", 
    authDomain: "://firebaseapp.com",
    databaseURL: "https://firebaseio.com",
    projectId: "my-simple-games",
    storageBucket: "://appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:a1b2c3d4e5f6g7h8i9j0k1"
};

// 3. เริ่มต้นระบบฐานข้อมูล Firebase (เวอร์ชัน 8)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// 4. ชุดพิกัดจุดจับผิดด่าน 1-5 (ด่านละ 3 จุด รองรับระบบพิกัด หรือ)
const diffsData = [
    [ [{x:180,y:150}, {x:220,y:150}], [{x:90,y:280}], [{x:310,y:80}] ],
    [ [{x:200,y:200}], [{x:300,y:120}], [{x:100,y:320}] ],
    [ [{x:150,y:80}], [{x:250,y:250}], [{x:70,y:190}] ],
    [ [{x:120,y:150}], [{x:280,y:280}], [{x:200,y:50}] ],
    [ [{x:220,y:180}], [{x:110,y:90}], [{x:320,y:310}] ]
];

// 5. ตัวแปรสถานะภายในเกม
let curStg = 0, lives = 3, foundInStage = 0, isOver = false, mode = "NEXT", activeDiffs = [];
let totalScore = 0, playerName = "Guest";

// ดึงคะแนน High Score จากออนไลน์มาแสดงที่หน้าแรกทันทีที่เปิดเว็บ
displayHighScores();

// 6. ฟังก์ชันเมื่อผู้เล่นกดปุ่มเริ่มเกมจากหน้าแรก
function initStartGame() {
    const inputName = document.getElementById("playerNameInput").value.trim();
    if (inputName === "") {
        alert("กรุณากรอกชื่อผู้เล่นก่อนเริ่มเกมนะครับ!");
        return;
    }
    playerName = inputName;
    totalScore = 0; 
    lives = 3; 
    curStg = 0;

    // สลับหน้าจอ เมนูหลัก -> หน้าต่างเล่นเกม
    document.getElementById("mainMenu").style.display = "none";
    document.getElementById("gameHeader").style.display = "block";
    document.getElementById("gameArea").style.display = "flex";
    document.getElementById("displayPlayerName").innerText = playerName;

    loadStage(curStg);
}

// 7. ฟังก์ชันโหลดด่านและรูปภาพในแต่ละด่าน
function loadStage(idx) {
    isOver = false; 
    foundInStage = 0;
    
    document.getElementById("stg").innerText = idx + 1;
    document.getElementById("gameScore").innerText = totalScore;
    document.getElementById("lives").innerText = "❤".repeat(lives) + "💔".repeat(3 - lives);
    
    // เปลี่ยนพาธไฟล์รูปตามด่าน เช่น image1L.jpg , image1R.jpg
    document.getElementById("srcL").src = `image${idx + 1}L.jpg`;
    document.getElementById("srcR").src = `image${idx + 1}R.jpg`;
    
    // เคลียร์วงกลมสีเขียวด่านเก่าออกทั้งหมด
    document.querySelectorAll(".marker").forEach(el => el.remove());
    
    // โหลดจุดต่างพร้อมฝังสถานะ found: false ไว้เช็ค
    activeDiffs = diffsData[idx].map(d => ({ positions: d, found: false }));
    document.getElementById("overlay").style.display = "none";
}

// 8. ฟังก์ชันระบบตรวจสอบการคลิกหาจุดจับผิด
function checkClick(e) {
    if (isOver) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    let hit = false;

    for (let d of activeDiffs) {
        if (!d.found) {
            // เช็คว่าเมาส์จิ้มโดนพิกัดใดพิกัดหนึ่งในกลุ่มย่อย (รัศมี 30 พิกเซล)
            const match = d.positions.find(pos => Math.sqrt((cx - pos.x)**2 + (cy - pos.y)**2) <= 30);
            
            if (match) {
                d.found = true; 
                hit = true; 
                foundInStage++;
                totalScore += 10; // คลิกถูกรับ 10 คะแนนสะสม
                document.getElementById("gameScore").innerText = totalScore;
                
                playSound(sndCorrect);
                
                // แสดงวงกลมสีเขียวครบทุกจุดในกลุ่ม "หรือ" นั้น
                d.positions.forEach(pos => createMarker(pos.x, pos.y));
                
                // ถ้าหาครบ 3 จุดในด่านนี้
                if (foundInStage === 3) {
                    showOverlay(curStg === 4 ? "WIN_ALL" : "NEXT");
                }
                break;
            }
        }
    }
    // ถ้าคลิกผิดตำแหน่ง
    if (!hit) {
        lives--;
        document.getElementById("lives").innerText = "❤".repeat(lives) + "💔".repeat(3 - lives);
        playSound(sndWrong);
        if (lives <= 0) showOverlay("GAME_OVER");
    }
}

// 9. ฟังก์ชันสร้างวงกลมมาร์กสีเขียวเรืองแสงครอบจุดที่เจอ
function createMarker(x, y) {
    ["imgL", "imgR"].forEach(id => {
        const m = document.createElement("div"); 
        m.className = "marker";
        m.style.left = x + "px"; 
        m.style.top = y + "px";
        document.getElementById(id).appendChild(m);
    });
}

// 10. ฟังก์ชันแสดงผลหน้าต่างป๊อปอัปแจ้งผลด่าน/แพ้/ชนะ
function showOverlay(type) {
    isOver = true;
    playSound(sndWin);
    const txt = document.getElementById("overText"), btn = document.getElementById("overBtn");
    
    if (type === "NEXT") { 
        txt.innerText = `ผ่านด่านที่ ${curStg+1} แล้ว!\nคะแนนสะสมตอนนี้: ${totalScore} แต้ม`; 
        btn.innerText = "ลุยด่านถัดไป"; 
        mode = "NEXT"; 
    } else {
        // เมื่อเคลียร์ด่าน 5 หรือเลือดหมด ส่งคะแนนขึ้นคลาวด์ Firebase ออนไลน์
        checkAndSaveHighScore(playerName, totalScore);
        
        if (type === "WIN_ALL") { 
            txt.innerHTML = `🎉 สุดยอด! เคลียร์ครบ 5 ด่าน! 🎉<br>รวมทำได้: ${totalScore} คะแนน`; 
            txt.style.color = "#2ecc71";
        } else { 
            txt.innerHTML = `💥 เกมโอเวอร์ พลังชีวิตหมด! 💥<br>คะแนนรวม: ${totalScore} คะแนน`; 
            txt.style.color = "#e74c3c";
        }
        btn.innerText = "กลับหน้าหลัก"; 
        mode = "MAIN_MENU";
    }
    document.getElementById("overlay").style.display = "flex";
}

// 11. ฟังก์ชันจัดการเมื่อคลิกปุ่มบนแผงป๊อปอัปแจ้งผล
function overlayAction() {
    if (mode === "NEXT") { 
        curStg++; 
        loadStage(curStg);
    } else if (mode === "MAIN_MENU") {
        // เคลียร์ค่า สลับหน้าจอกลับสู่เมนูหลักหน้าแรกสุด
        document.getElementById("overlay").style.display = "none";
        document.getElementById("gameHeader").style.display = "none";
        document.getElementById("gameArea").style.display = "none";
        document.getElementById("mainMenu").style.display = "block";
        document.getElementById("playerNameInput").value = "";
        displayHighScores(); // ดึงบอร์ดออนไลน์เวอร์ชันล่าสุดมาแสดงผล
    }
}

// 12. ระบบบันทึกคะแนนสะสมออนไลน์ข้ามเครื่องขึ้น Firebase
function checkAndSaveHighScore(name, score) {
    db.ref(`highscores/${name}`).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const oldScore = snapshot.val().score;
            // ถ้าชื่อผู้เล่นคนเดิมทำคะแนนรอบล่าสุดได้ดีกว่าเก่า ให้ทำการเขียนทับบันทึกใหม่
            if (score > oldScore) {
                db.ref('highscores/' + name).set({ name: name, score: score });
            }
        } else {
            // ถ้าเป็นผู้เล่นชื่อใหม่ บันทึกชื่อและคะแนนขึ้นระบบออนไลน์ทันที
            db.ref('highscores/' + name).set({ name: name, score: score });
        }
    }).catch((error) => { console.error("Firebase Save Error:", error); });
}

// 13. ระบบดึงคะแนนและจัดอันดับออนไลน์ Top 10 มาแสดงบนหน้าหลัก
function displayHighScores() {
    db.ref('highscores').once('value').then((snapshot) => {
        const scoreListUl = document.getElementById("scoreList");
        scoreListUl.innerHTML = "";
        
        if (!snapshot.exists()) {
            scoreListUl.innerHTML = `<li class="score-item" style="color:#aaa; justify-content:center;">ยังไม่มีบันทึกคะแนนสูงสุดบนเซิร์ฟเวอร์</li>`;
            return;
        }

        const data = snapshot.val();
        // แปลงข้อมูล Object จากเซิร์ฟเวอร์ให้ออกมาเป็น Array เพื่อทำการจัดลำดับ
        const scoresArray = Object.keys(data).map(key => data[key]);
        
        // เรียงลำดับคะแนนจากมากไปน้อย และดึงข้อมูลเฉพาะ 10 ลำดับแรก
        scoresArray.sort((a, b) => b.score - a.score);
        const top10 = scoresArray.slice(0, 10);

        top10.forEach((item, index) => {
            const li = document.createElement("li");
            li.className = "score-item";
            li.innerHTML = `<span>อันดับ ${index + 1}. <b>${item.name}</b></span> <span>${item.score} แต้ม</span>`;
            scoreListUl.appendChild(li);
        });
    }).catch((error) => { console.error("Firebase Read Error:", error); });
}
