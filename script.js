// ==========================================
// ⚙️ การตั้งค่าระบบและตัวแปรหลัก
// ==========================================
// 🟢 ผูกลิงก์ระบบใหม่ตัวล่าสุดของคุณเรียบร้อยครับ
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxk6prt6h_oHOp9GcmrY237hZU_r_yux7vpTqNgXDfUBqWwXL_42WoCYoxjR360PireCA/exec";

let rawCloudData = { theses: [], documents: [], books: [] }; 
let currentSystemMode = "TAPE"; 
let currentBookPage = "-";
let currentUserLevel = 1; 

// ==========================================
// 🔐 ระบบยืนยันตัวตนและการจัดการหน้าจอ
// ==========================================
function toggleSidebarDrawer(open) {
    const sidebar = document.getElementById('sidebarDrawer');
    const mainContent = document.getElementById('mainContentArea');
    if (open) { 
        sidebar.classList.remove('collapsed'); 
        mainContent.classList.remove('fullscreen'); 
    } else { 
        sidebar.classList.add('collapsed'); 
        mainContent.classList.add('fullscreen'); 
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();
    const error = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!email || !pass) { 
        error.innerText = "❌ กรุณากรอกอีเมลและรหัสผ่าน"; 
        error.style.display = "block"; 
        return; 
    }

    btn.disabled = true; 
    btn.innerText = "กำลังตรวจสอบสิทธิ์...";
    
    try {
        const response = await fetch(`${WEB_APP_URL}?email=${encodeURIComponent(email)}&pass=${encodeURIComponent(pass)}`);
        const data = await response.json();
        
        if (data.result === true) {
            currentUserLevel = data.userLevel || 1; 
            
            rawCloudData = {
                theses: data.theses || [],
                documents: data.documents || [],
                books: data.books || [] 
            };
            
            buildTapeDynamicFilters(rawCloudData.theses);
            buildDocDynamicFilters(rawCloudData.documents);
            buildBookDynamicFilters(rawCloudData.books);

            document.getElementById('txtUserLevelBadge').innerText = `Search Radius: ${currentUserLevel}`;

            document.getElementById('hub-card-TAPE').classList.remove('disabled-card');
            document.getElementById('hub-card-DOC').classList.remove('disabled-card');
            document.getElementById('hub-card-BOOK').classList.remove('disabled-card');

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('hub-screen').style.display = 'flex'; 
        } else {
            error.innerText = "❌ " + (data.msg || "สิทธิ์การยืนยันระบบไม่ถูกต้อง"); 
            error.style.display = "block";
            btn.disabled = false; 
            btn.innerText = "ยืนยันสิทธิ์เข้าใช้งาน";
        }
    } catch (e) {
        error.innerText = "❌ ระบบแจ้งว่า: " + e.toString();
        error.style.display = "block"; 
        btn.disabled = false; 
        btn.innerText = "ยืนยันสิทธิ์เข้าใช้งาน";
    }
}

function switchSystemMode(mode) {
    currentSystemMode = mode;
    document.getElementById('hub-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    document.getElementById('placeholderText').style.display = 'block';
    document.getElementById('viewDisplayCardTape').style.display = 'none';
    document.getElementById('viewDisplayCardDoc').style.display = 'none';
    document.getElementById('viewDisplayCardBook').style.display = 'none';
    document.getElementById('viewBookShelf').style.display = 'none';
    document.getElementById('tapePlayer').src = "";
    document.getElementById('bookPdfPlayer').src = "";

    document.getElementById('filterGroupTape').style.display = 'none';
    document.getElementById('filterGroupDoc').style.display = 'none';
    document.getElementById('filterGroupBook').style.display = 'none';

    if(mode === "TAPE") {
        document.getElementById('txtNavTitle').innerText = "📺 คลังบันทึกการบรรยาย";
        document.getElementById('txtSidebarHeader').innerText = "📺 รายการเทปบรรยาย";
        document.getElementById('filterGroupTape').style.display = 'block';
        toggleGoshoFilters(); 
        renderTapeSidebar(rawCloudData.theses);
    } 
    else if(mode === "DOC") {
        document.getElementById('txtNavTitle').innerText = "📄 คลังเอกสารจัดเก็บ";
        document.getElementById('txtSidebarHeader').innerText = "📄 รายการเอกสารคลัง";
        document.getElementById('filterGroupDoc').style.display = 'block';
        renderDocSidebar(rawCloudData.documents);
    }
    else if(mode === "BOOK") {
        document.getElementById('txtNavTitle').innerText = "📚 คลังหนังสือ";
        document.getElementById('txtSidebarHeader').innerText = "📚 สารบัญบทเรียน";
        document.getElementById('filterGroupBook').style.display = 'block';
        document.getElementById('placeholderText').style.display = 'none';
        document.getElementById('viewBookShelf').style.display = 'block'; 
        
        renderBookShelf(rawCloudData.books);
        renderBookSidebar(rawCloudData.books);
    }
    toggleSidebarDrawer(true);
}

function backToHub() {
    document.getElementById('main-app').style.display = 'none'; 
    document.getElementById('hub-screen').style.display = 'flex';
}

// ==========================================
// 📺 1. ระบบฟังก์ชันของโหมดคลังเทป (TAPE)
// ==========================================
function toggleGoshoFilters() {
    const type = document.getElementById('tapeDropType').value;
    const subFilter = document.getElementById('subFilterGosho');
    if (type === "ธรรมนิพนธ์") {
        subFilter.style.display = "block";
    } else {
        subFilter.style.display = "none";
        document.getElementById('tapeDropWrittenTo').value = "";
        document.getElementById('tapeDropWrittenAt').value = "";
        document.getElementById('tapeDropWrittenYear').value = "";
    }
}

function buildTapeDynamicFilters(data) {
    const dMeet = document.getElementById('tapeDropMeet');
    const dLoc = document.getElementById('tapeDropLocation');
    const dType = document.getElementById('tapeDropType');
    const dTo = document.getElementById('tapeDropWrittenTo');
    const dAt = document.getElementById('tapeDropWrittenAt');
    const dYear = document.getElementById('tapeDropWrittenYear');
    const dLecYear = document.getElementById('tapeDropLectureYear'); 
    
    if(!dMeet) return;
    
    dMeet.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dLoc.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dType.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dTo.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dAt.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dYear.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    dLecYear.innerHTML = '<option value="">-- ทั้งหมด --</option>'; 
    
    const meets = new Set(); const locs = new Set(); const types = new Set();
    const tos = new Set(); const ats = new Set(); const years = new Set();
    const lecYears = new Set(); 

    data.forEach(item => {
        if(item.meet_title) meets.add(item.meet_title.trim());
        if(item.lectured_at) locs.add(item.lectured_at.trim());
        if(item.type) types.add(item.type.trim());
        if(item.written_to) tos.add(item.written_to.trim());
        if(item.written_at) ats.add(item.written_at.trim());
        if(item.written_year) years.add(item.written_year.trim());
        
        if(item.date && item.date.includes("-")) {
            const yearPart = item.date.split("-")[0];
            if(yearPart) lecYears.add(yearPart.trim());
        }
    });

    [...meets].sort().forEach(m => dMeet.innerHTML += `<option value="${m}">${m}</option>`);
    [...locs].sort().forEach(l => dLoc.innerHTML += `<option value="${l}">${l}</option>`);
    [...types].sort().forEach(t => dType.innerHTML += `<option value="${t}">${t}</option>`);
    [...tos].sort().forEach(t => dTo.innerHTML += `<option value="${t}">${t}</option>`);
    [...ats].sort().forEach(a => dAt.innerHTML += `<option value="${a}">${a}</option>`);
    [...years].sort().forEach(y => dYear.innerHTML += `<option value="${y}">${y}</option>`);
    [...lecYears].sort().sort((a,b) => b-a).forEach(y => dLecYear.innerHTML += `<option value="${y}">${y}</option>`); 
}

function renderTapeSidebar(items) {
    const ul = document.getElementById('mainDataUl'); ul.innerHTML = "";
    if (!items || items.length === 0) {
        ul.innerHTML = '<li style="padding:20px; text-align:center;">ไม่พบข้อมูลเทปบรรยาย หรือระดับสิทธิ์ไม่ถึง</li>';
        return;
    }
    let currentMeet = "";
    items.forEach((item, idx) => {
        if (item.meet_title !== currentMeet) {
            currentMeet = item.meet_title;
            ul.innerHTML += `<li class="meet-group-title">🏷️ ${currentMeet}</li>`;
        }
        
        let lYear = ""; let lMonth = "";
        if(item.date && item.date.includes("-")) {
            const parts = item.date.split("-");
            lYear = parts[0] || "";
            lMonth = parts[1] || "";
        }

        ul.innerHTML += `
            <li class="tape-item tape-row-node" id="t-node-${idx}" 
                data-meet="${item.meet_title}" 
                data-loc="${item.lectured_at}"
                data-type="${item.type}"
                data-to="${item.written_to}"
                data-at="${item.written_at}"
                data-year="${item.written_year}"
                data-lyear="${lYear}"
                data-lmonth="${lMonth}"
                data-title="${item.lecture_title ? item.lecture_title.toLowerCase() : ''}" 
                onclick="openTapeTheater(${idx})">
                <span style="font-weight: 500;">▶️ ${item.lecture_title}</span>
            </li>
        `;
    });
    runMasterFilter();
}

function openTapeTheater(idx) {
    const tape = rawCloudData.theses[idx];
    document.getElementById('placeholderText').style.display = 'none';
    document.getElementById('viewDisplayCardTape').style.display = 'block';
    document.getElementById('viewDisplayCardDoc').style.display = 'none';
    document.getElementById('viewDisplayCardBook').style.display = 'none';

    document.getElementById('cardTapeTitle').innerText = tape.lecture_title;
    document.getElementById('detailsMeetGroup').innerText = `คลังหลักมีท: ${tape.meet_title} | สถานที่: ${tape.lectured_at || '-'} | วันที่บรรยาย: ${tape.date || '-'}`;
    document.getElementById('detailsBadge').innerText = tape.type || "วิดีโอ";

    let ytUrl = tape.youtube_url || "";
    if(ytUrl.includes("youtu.be/")) {
        ytUrl = ytUrl.replace("youtu.be/", "www.youtube.com/embed/");
    } else if(ytUrl.includes("watch?v=")) {
        ytUrl = ytUrl.replace("watch?v=", "embed/");
    }
    document.getElementById('tapePlayer').src = ytUrl;

    document.querySelectorAll('.tape-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById(`t-node-${idx}`)) document.getElementById(`t-node-${idx}`).classList.add('active');
    if(window.innerWidth <= 1024) toggleSidebarDrawer(false); 
}

// ==========================================
// 📄 2. ระบบฟังก์ชันของโหมดคลังเอกสาร (DOC)
// ==========================================
function buildDocDynamicFilters(data) {
    const dType = document.getElementById('docDropType');
    if(!dType) return;
    dType.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    const types = new Set();
    data.forEach(item => { if(item.doc_type) types.add(item.doc_type.trim()); });
    types.forEach(t => dType.innerHTML += `<option value="${t}">${t}</option>`);
}

function renderDocSidebar(items) {
    const ul = document.getElementById('mainDataUl'); ul.innerHTML = "";
    if (!items || items.length === 0) {
        ul.innerHTML = '<li style="padding:20px; text-align:center;">ไม่พบข้อมูลเอกสาร หรือระดับสิทธิ์ไม่ถึง</li>';
        return;
    }
    items.forEach((item, idx) => {
        ul.innerHTML += `
            <li class="tape-item doc-row-node" id="d-node-${idx}" 
                data-type="${item.doc_type}" 
                data-title="${item.title ? item.title.toLowerCase() : ''}" 
                onclick="openDocTheater(${idx})">
                <span style="font-weight: 500;">📄 ${item.title}</span>
            </li>
        `;
    });
    runMasterFilter();
}

function openDocTheater(idx) {
    const doc = rawCloudData.documents[idx];
    document.getElementById('placeholderText').style.display = 'none';
    document.getElementById('viewDisplayCardTape').style.display = 'none';
    document.getElementById('viewDisplayCardDoc').style.display = 'block';
    document.getElementById('viewDisplayCardBook').style.display = 'none';

    document.getElementById('cardDocTitle').innerText = doc.title;
    document.getElementById('cardDocTypeBadge').innerText = `หมวดหมู่: ${doc.doc_type} | ผู้จัดทำ: ${doc.creator || '-'}`;
    document.getElementById('btnDocOpenLink').href = doc.file_url || doc.download_url;

    document.querySelectorAll('.tape-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById(`d-node-${idx}`)) document.getElementById(`d-node-${idx}`).classList.add('active');
    if(window.innerWidth <= 1024) toggleSidebarDrawer(false); 
}

// ==========================================
// 📚 3. ระบบฟังก์ชันของโหมดหนังสือ (BOOK)
// ==========================================
function buildBookDynamicFilters(data) {
    const dBook = document.getElementById('bookDropName');
    if(!dBook) return;
    dBook.innerHTML = '<option value="">-- หนังสือทั้งหมด --</option>';
    if (!data || data.length === 0) return;
    const books = new Set();
    data.forEach(item => { if(item.book_name) books.add(item.book_name.trim()); });
    books.forEach(b => dBook.innerHTML += `<option value="${b}">${b}</option>`);
}

function renderBookShelf(data) {
    const shelf = document.getElementById('bookShelfContainer'); shelf.innerHTML = "";
    if(!shelf) return;
    const uniqueBooks = []; const map = new Map();
    for (const item of data) {
        if(!map.has(item.book_name)){
            map.set(item.book_name, true);
            uniqueBooks.push({ name: item.book_name, cover: item.cover_url });
        }
    }
    uniqueBooks.forEach(book => {
        let coverSrc = book.cover || "https://via.placeholder.com/200x300?text=No+Cover";
        shelf.innerHTML += `
            <div class="book-cover-card" onclick="filterByShelf('${book.name}')">
                <img src="${coverSrc}" class="book-cover-img" alt="cover">
                <div class="book-cover-title">${book.name}</div>
            </div>
        `;
    });
}

function filterByShelf(bookName) {
    document.getElementById('bookDropName').value = bookName;
    runMasterFilter();
    toggleSidebarDrawer(true);
}

function renderBookSidebar(items) {
    const ul = document.getElementById('mainDataUl'); ul.innerHTML = "";
    if (!items || items.length === 0) {
        ul.innerHTML = '<li style="padding:20px; text-align:center;">ไม่พบข้อมูลหนังสือ หรือระดับสิทธิ์ไม่ถึง</li>';
        return;
    }
    let sortedItems = [...items].sort((a, b) => {
        if(a.book_name === b.book_name) return (a.chapter_no || 0) - (b.chapter_no || 0);
        return a.book_name.localeCompare(b.book_name);
    });
    let currentBook = "";
    sortedItems.forEach((item) => {
        const originalIdx = rawCloudData.books.findIndex(x => x.id === item.id);
        if (item.book_name !== currentBook) {
            currentBook = item.book_name;
            ul.innerHTML += `<li class="meet-group-title">📖 ${currentBook}</li>`;
        }
        ul.innerHTML += `
            <li class="tape-item book-row-node" id="b-node-${originalIdx}" 
                data-book="${item.book_name}" 
                data-title="${item.chapter_title ? item.chapter_title.toLowerCase() : ''}" 
                data-kw="${item.keywords ? item.keywords.toLowerCase() : ''}" 
                onclick="openBookTheater(${originalIdx})">
                <div style="display:flex; align-items:center; width:100%;">
                    <span style="font-weight: 500;">${item.chapter_title}</span>
                    <span class="page-badge-small">หน้า ${item.page_number}</span>
                </div>
            </li>
        `;
    });
    runMasterFilter();
}

function openBookTheater(idx) {
    const book = rawCloudData.books[idx];
    document.getElementById('placeholderText').style.display = 'none';
    document.getElementById('viewBookShelf').style.display = 'none';
    document.getElementById('viewDisplayCardTape').style.display = 'none';
    document.getElementById('viewDisplayCardDoc').style.display = 'none';
    document.getElementById('viewDisplayCardBook').style.display = 'block';

    document.getElementById('cardBookNameBadge').innerText = `📖 ${book.book_name}`;
    document.getElementById('cardBookChapterTitle').innerText = book.chapter_title;
    
    currentBookPage = book.page_number;
    document.getElementById('cardBookPageNum').innerText = currentBookPage;

    let pdfUrl = book.pdf_url || "";
    pdfUrl = pdfUrl.replace(/\/view.*$/, "/preview");
    const smartUrl = `${pdfUrl}#page=${book.page_number}`;
    
    document.getElementById('bookPdfPlayer').src = smartUrl;
    document.getElementById('btnBookFullscreen').href = smartUrl;

    document.querySelectorAll('.tape-item').forEach(el => el.classList.remove('active'));
    if(document.getElementById(`b-node-${idx}`)) document.getElementById(`b-node-${idx}`).classList.add('active');
    if(window.innerWidth <= 1024) toggleSidebarDrawer(false); 
}

function copyPageNumber() {
    navigator.clipboard.writeText(currentBookPage);
    alert(`คัดลอกเลขหน้า "${currentBookPage}" แล้ว นำไปพิมพ์บนช่องค้นหาหน้า PDF ได้เลยครับ`);
}

// ==========================================
// 🔍 4. ระบบการค้นหาและคำนวณตัวกรอง Master
// ==========================================
function runMasterFilter() {
    if (currentSystemMode === "TAPE") {
        const kw = document.getElementById('tapeSearchTitle').value.toLowerCase().trim();
        const meet = document.getElementById('tapeDropMeet').value;
        const loc = document.getElementById('tapeDropLocation').value;
        const type = document.getElementById('tapeDropType').value;
        const lecYear = document.getElementById('tapeDropLectureYear').value; 
        const lecMonth = document.getElementById('tapeDropLectureMonth').value; 
        
        const to = document.getElementById('tapeDropWrittenTo').value;
        const at = document.getElementById('tapeDropWrittenAt').value;
        const year = document.getElementById('tapeDropWrittenYear').value;

        document.querySelectorAll('.tape-row-node').forEach(el => {
            const mMeet = el.getAttribute('data-meet') || "";
            const mLoc = el.getAttribute('data-loc') || "";
            const mType = el.getAttribute('data-type') || "";
            const mTo = el.getAttribute('data-to') || "";
            const mAt = el.getAttribute('data-at') || "";
            const mYear = el.getAttribute('data-year') || "";
            const mLyear = el.getAttribute('data-lyear') || ""; 
            const mLmonth = el.getAttribute('data-lmonth') || ""; 
            const mTitle = el.getAttribute('data-title') || "";
            
            const matchKw = kw === "" || mTitle.includes(kw);
            const matchMeet = meet === "" || mMeet === meet;
            const matchLoc = loc === "" || mLoc === loc;
            const matchType = type === "" || mType === type;
            const matchLecYear = lecYear === "" || mLyear === lecYear; 
            const matchLecMonth = lecMonth === "" || mLmonth === lecMonth; 
            
            let matchSub = true;
            if (type === "ธรรมนิพนธ์") {
                const matchTo = to === "" || mTo === to;
                const matchAt = at === "" || mAt === at;
                const matchYear = year === "" || mYear === year;
                matchSub = matchTo && matchAt && matchYear;
            }

            el.style.display = (matchKw && matchMeet && matchLoc && matchType && matchLecYear && matchLecMonth && matchSub) ? "flex" : "none";
        });
        hideEmptyHeaders();
    }
    else if (currentSystemMode === "DOC") {
        const kw = document.getElementById('docSearchMain').value.toLowerCase().trim();
        const type = document.getElementById('docDropType').value;

        document.querySelectorAll('.doc-row-node').forEach(el => {
            const mType = el.getAttribute('data-type') || "";
            const mTitle = el.getAttribute('data-title') || "";
            const matchKw = kw === "" || mTitle.includes(kw);
            const matchType = type === "" || mType === type;

            el.style.display = (matchKw && matchType) ? "flex" : "none";
        });
    }
    else if (currentSystemMode === "BOOK") {
        const kw = document.getElementById('bookSearchMain').value.toLowerCase().trim();
        const bookName = document.getElementById('bookDropName').value;

        document.querySelectorAll('.book-row-node').forEach(el => {
            const mBook = el.getAttribute('data-book') || "";
            const mTitle = el.getAttribute('data-title') || "";
            const mKw = el.getAttribute('data-kw') || "";
            const matchKw = kw === "" || mTitle.includes(kw) || mKw.includes(kw);
            const matchBook = bookName === "" || mBook === bookName;

            el.style.display = (matchKw && matchBook) ? "flex" : "none";
        });
        hideEmptyHeaders();
    }
    calculateCounters();
}

function hideEmptyHeaders() {
    document.querySelectorAll('.meet-group-title').forEach(title => {
        let next = title.nextElementSibling; let visible = false;
        while (next && !next.classList.contains('meet-group-title')) {
            if (next.style.display !== 'none') { visible = true; break; }
            next = next.nextElementSibling;
        }
        title.style.display = visible ? 'block' : 'none';
    });
}

function calculateCounters() {
    let selector = '.tape-row-node';
    if(currentSystemMode === "DOC") selector = '.doc-row-node';
    if(currentSystemMode === "BOOK") selector = '.book-row-node';
    
    const total = document.querySelectorAll(selector).length;
    const visible = Array.from(document.querySelectorAll(selector)).filter(el => el.style.display !== 'none').length;
    const counterLabel = document.getElementById('txtCounterLabel');
    if(counterLabel) counterLabel.innerText = `${visible} / ${total} รายการ`;
}