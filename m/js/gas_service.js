const GAS_URL = "https://script.google.com/macros/s/AKfycbzDWH34gJk42elBUl-Jky8kvvVlA8s36pYi-bU05wxr7CoOlrWNbOAKS-wxj8kYb-JV/exec";
let rentalCache = [];

// 1. 대관 데이터 가져오기 (캐싱 지원)
async function getRentalData(forceRefresh = false) {
    if (!forceRefresh) {
        const local = localStorage.getItem("rental_db_cache");
        if (local) {
            rentalCache = JSON.parse(local);
            return { data: rentalCache, source: 'CACHED' };
        }
    }
    try {
        const res = await fetch(`${GAS_URL}?t=${new Date().getTime()}`);
        const data = await res.json();
        if (data && data.length > 0) {
            rentalCache = data;
            localStorage.setItem("rental_db_cache", JSON.stringify(data));
            return { data: rentalCache, source: 'ONLINE' };
        }
    } catch (e) {
        return { data: rentalCache, source: 'OFFLINE' };
    }
}

// 2. 근무조 자동 계산 함수
function getShiftInfo(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const baseDate = new Date('2026-03-09').setHours(0,0,0,0);
    const targetDate = new Date(dateStr).setHours(0,0,0,0);
    const diff = Math.round((targetDate - baseDate) / 86400000);
    const patterns = [
        { name: 'C조', color: '#1976D2' },
        { name: 'A조', color: '#F57C00' },
        { name: 'B조', color: '#D32F2F' }
    ];
    return patterns[((diff % 3) + 3) % 3];
}

// 3. ✨ [신규] 특정 건물/날짜 기준 "보고서 메시지" 생성기
function generateReportText(targetDate, targetBuilding = "의산연") {
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const searchBu = targetBuilding === "의산연" ? "의생명산업연구원" : targetBuilding;

    const filtered = rentalCache.filter(r => r.rawDate === dateStr && (r.bu && r.bu.includes(searchBu)));
    const shift = getShiftInfo(targetDate);

    let msg = `[${yyyy}.${mm}.${dd} (${shift.name})] ${targetBuilding} 대관 보고\n`;
    msg += `----------------------------\n`;

    if (filtered.length === 0) {
        msg += `특이사항 없음 (금일 대관 일정 없음)\n`;
    } else {
        msg += `총 ${filtered.length}건 진행\n\n`;
        filtered.forEach((r, idx) => {
            msg += `${idx + 1}. ${r.event}\n`;
            msg += `   - 장소: ${r.place} (${r.time})\n`;
            msg += `   - 주관: ${r.dept} (${r.people}명)\n`;
        });
    }
    msg += `----------------------------\n`;
    msg += `이상 무. 특이상황 발생 시 즉시 보고드리겠습니다.`;
    return msg;
}
