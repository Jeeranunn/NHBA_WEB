const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzWx3qLONK8nKe8MLLuVgQZzV-A717e5usy7G7bzvUtau98As5t2s5BFKBIQlIrLATLWA/exec";
    
let rawCloudData = { theses: [], documents: [], books: [] }; // 🆕 เพิ่ม books
let currentSystemMode = "TAPE"; 
let currentBookPage = "-";

function toggleSidebarDrawer(open) {
    const sidebar = document.getElementById('sidebarDrawer');
    const mainContent = document.getElementById('mainContentArea');
    if (open) { sidebar.classList.remove('collapsed'); mainContent.classList.remove('fullscreen'); } 
    else { sidebar.classList.add('collapsed'); mainContent.classList.add('fullscreen'); }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value.trim();
    const error = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!email || !pass) { error.innerText = "❌ กรุณากรอกอีเมลและรหัสผ่าน"; error.style.display = "block"; return; }

    btn.disabled = true; btn.innerText = "กำลังตรวจสอบสิทธิ์...";
    try {
        const response = await fetch(`${WEB_APP_URL}?email=${encodeURIComponent(email)}&pass=${encodeURIComponent(pass)}`);
        const data = await response.json();
        
        if (data.result === true) {
            rawCloudData = {
                theses: data.theses || [],
                documents: data.documents || [],
                books: data.books || [] // 🆕 รับข้อมูลหนังสือจาก Apps Script
            };
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('hub-screen').style.display = 'flex'; 
        } else {
            error.innerText = "❌ " + (data.msg || "สิทธิ์การยืนยันระบบไม่ถูกต้อง"); error.style.display = "block";
            btn.disabled = false; btn.innerText = "ยืนยันสิทธิ์เข้าใช้งาน";
        }
    } catch (e) {
        error.innerText = "❌ การเข้าถึงล้มเหลว กรุณาตรวจสอบการเชื่อมต่อ";
        error.style.display = "block"; btn.disabled = false; btn.innerText = "ยืนยันสิทธิ์เข้าใช้งาน";
    }
}

function switchSystemMode(mode) {
    currentSystemMode = mode;
    document.getElementById('hub-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
    
    // รีเซ็ตการแสดงผล
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
        document.getElementById('filterGroupTape').style.display = 'block';
        // (ละฟังก์ชัน render เทปเดิมไว้ สมมติว่ามีเหมือนโค้ดชุดแรกสุด)
    } 
    else if(mode === "DOC") {
        document.getElementById('txtNavTitle').innerText = "📄 คลังเอกสารจัดเก็บ";
        document.getElementById('filterGroupDoc').style.display = 'block';
    }
    // 🆕 โหมดหนังสือ
    else if(mode === "BOOK") {
        document.getElementById('txtNavTitle').innerText = "📚 คลังหนังสือธรรมะ";
        document.getElementById('filterGroupBook').style.display = 'block';
        document.getElementById('placeholderText').style.display = 'none';
        document.getElementById('viewBookShelf').style.display = 'block'; // โชว์ชั้นหนังสือ
        
        buildBookDynamicFilters(rawCloudData.books);
        renderBookShelf(rawCloudData.books);
        renderBookSidebar(rawCloudData.books);
    }
    toggleSidebarDrawer(true);
}

function backToHub() {
    document.getElementById('main-app').style.display = 'none'; document.getElementById('hub-screen').style.display = 'flex';
}

// -----------------------------------------
// 🆕 ฟังก์ชันสำหรับระบบ BOOK ARCHIVE 
// -----------------------------------------

function buildBookDynamicFilters(data) {
    const dBook = document.getElementById('bookDropName');
    dBook.innerHTML = '<option value="">-- หนังสือทั้งหมด --</option>';
    if (!data || data.length === 0) return;

    const books = new Set();
    data.forEach(item => { if(item.book_name) books.add(item.book_name.trim()); });
    books.forEach(b => dBook.innerHTML += `<option value="${b}">${b}</option>`);
}

function renderBookShelf(data) {
    const shelf = document.getElementById('bookShelfContainer');
    shelf.innerHTML = "";
    
    // ดึงเฉพาะชื่อหนังสือและปกที่ไม่ซ้ำกัน
    const uniqueBooks = [];
    const map = new Map();
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
    toggleSidebarDrawer(true); // เปิดสารบัญให้ดูว่ากรองแล้ว
}

function renderBookSidebar(items) {
    const ul = document.getElementById('mainDataUl'); ul.innerHTML = "";
    if (!items || items.length === 0) {
        ul.innerHTML = '<li style="padding:20px; text-align:center;">ไม่พบข้อมูลหนังสือ</li>';
        return;
    }

    // เรียงลำดับตามชื่อหนังสือ และ chapter_no
    let sortedItems = [...items].sort((a, b) => {
        if(a.book_name === b.book_name) return (a.chapter_no || 0) - (b.chapter_no || 0);
        return a.book_name.localeCompare(b.book_name);
    });

    let currentBook = "";
    sortedItems.forEach((item) => {
        // หา Original Index เพื่อใช้ตอนกดดู
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
                <div style="display:flex; align-items:center;">
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
    document.getElementById('viewDisplayCardBook').style.display = 'block';

    document.getElementById('cardBookNameBadge').innerText = `📖 ${book.book_name}`;
    document.getElementById('cardBookChapterTitle').innerText = book.chapter_title;
    
    currentBookPage = book.page_number;
    document.getElementById('cardBookPageNum').innerText = currentBookPage;

    // ประมวลผล Link PDF ให้กระโดดไปหน้าที่ต้องการ
    let pdfUrl = book.pdf_url || "";
    // ถ้ายูอาร์แอลมีคำว่า view หรือ preview ให้เอาออกแล้วใส่โค้ดหน้า
    pdfUrl = pdfUrl.replace(/\/view.*$/, "/preview");
    const smartUrl = `${pdfUrl}#page=${book.page_number}`;
    
    document.getElementById('bookPdfPlayer').src = smartUrl;
    document.getElementById('btnBookFullscreen').href = smartUrl;

    document.querySelectorAll('.tape-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`b-node-${idx}`).classList.add('active');
    
    if(window.innerWidth <= 1024) toggleSidebarDrawer(false); // ปิดสารบัญบนมือถือ
}

function copyPageNumber() {
    navigator.clipboard.writeText(currentBookPage);
    alert(`คัดลอกเลขหน้า "${currentBookPage}" แล้ว สามารถนำไปพิมพ์ในช่องค้นหาหน้า PDF ได้เลยครับ`);
}

function runMasterFilter() {
    if(currentSystemMode === "BOOK") {
        const kw = document.getElementById('bookSearchMain').value.toLowerCase().trim();
        const bookName = document.getElementById('bookDropName').value;

        document.querySelectorAll('.book-row-node').forEach(el => {
            const mBook = el.getAttribute('data-book') || "";
            const mTitle = el.getAttribute('data-title') || "";
            const mKw = el.getAttribute('data-kw') || "";
            
            const matchKw = kw === "" || mTitle.includes(kw) || mKw.includes(kw);
            const matchBook = bookName === "" || mBook === bookName;

            if (matchKw && matchBook) el.style.display = "flex";
            else el.style.display = "none";
        });

        // ซ่อนหัวข้อหนังสือถ้าไม่มีบทไหนตรงเลย
        document.querySelectorAll('.meet-group-title').forEach(title => {
            let next = title.nextElementSibling; let visible = false;
            while (next && !next.classList.contains('meet-group-title')) {
                if (next.style.display !== 'none') { visible = true; break; }
                next = next.nextElementSibling;
            }
            title.style.display = visible ? 'block' : 'none';
        });
    }
    
    // (ตรรกะกรอง TAPE และ DOC ใส่ไว้ตรงนี้เหมือนเดิม)
    calculateCounters();
}

function calculateCounters() {
    let selector = '.tape-row-node';
    if(currentSystemMode === "DOC") selector = '.doc-row-node';
    if(currentSystemMode === "BOOK") selector = '.book-row-node';
    
    const total = document.querySelectorAll(selector).length;
    const visible = Array.from(document.querySelectorAll(selector)).filter(el => el.style.display !== 'none').length;
    document.getElementById('txtCounterLabel').innerText = `${visible} / ${total} รายการ`;
}