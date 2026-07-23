// 매뉴얼 및 사이트맵 데이터 구성
const sitemapData = [
    {
        title: "🏛️ 대관·행사",
        colorClass: "text-emerald-600",
        items: [
            { name: "오늘행사 (모바일)", url: "rentalm.html" },
            { name: "대관조회 (PC)", url: "rental.html" },
            { name: "대관현황(학교)", url: "https://songeui.catholic.ac.kr/ko/service/application-for-rental_calendar.do", target: "_blank" }
        ]
    },
    {
        title: "📞 편의 정보",
        colorClass: "text-amber-600",
        items: [
            { name: "성의교정 시설안내", url: "search.html" },
            { name: "주요 전화번호", url: "yellowpage.html" },
            { name: "오늘의 식단", url: "meal.html" }
        ]
    },
    {
        title: "📅 근무·연차",
        colorClass: "text-blue-600",
        items: [
            { name: "근무달력/연차조회", url: "calendar.html" },
            { name: "연차달력/연차대장", url: "vacation.html" }
        ]
    },
    {
        title: "🚨 보안·운영",
        colorClass: "text-rose-600",
        items: [
            { name: "우천시 순찰보고", url: "patrol.html" }
        ]
    },
    // 분리된 업무 매뉴얼 섹션
    {
        title: "📖 업무 매뉴얼",
        colorClass: "text-indigo-600",
        fullWidth: true, // 하단 전체 너비 사용
        items: [
            { name: "🛡️ 보안/순찰 매뉴얼", url: "manual_security.html" },
            { name: "🏛️ 대관/행사 지원가이드", url: "manual_rental.html" },
            { name: "🚨 비상연락 대응수칙", url: "manual_emergency.html" },
            { name: "📱 시스템 사용 가이드", url: "manual_system.html" }
        ]
    }
];

// 사이트맵 동적 생성 로직
function renderSitemap() {
    const container = document.getElementById("sitemapContent");
    if (!container) return;

    let gridHtml = '<div class="grid grid-cols-2 gap-3">';
    let fullWidthHtml = '';

    sitemapData.forEach(cat => {
        if (cat.fullWidth) {
            fullWidthHtml += `
                <div class="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 mt-2">
                    <h3 class="text-[13px] font-black ${cat.colorClass} mb-2 flex items-center gap-1">${cat.title}</h3>
                    <div class="grid grid-cols-2 gap-2 text-[12px] font-bold text-slate-700">
                        ${cat.items.map(item => `
                            <a href="${item.url}" ${item.target ? `target="${item.target}"` : ''} 
                               class="bg-white p-2 rounded-xl border border-indigo-100 flex items-center gap-1 hover:text-indigo-600 shadow-sm transition-colors">
                               ${item.name}
                            </a>
                        `).join('')}
                    </div>
                </div>`;
        } else {
            gridHtml += `
                <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <h3 class="text-[13px] font-black ${cat.colorClass} mb-2 flex items-center gap-1">${cat.title}</h3>
                    <ul class="space-y-1.5 text-[12px] font-bold text-slate-600">
                        ${cat.items.map(item => `
                            <li>
                                <a href="${item.url}" ${item.target ? `target="${item.target}"` : ''} class="hover:underline block py-0.5">
                                    ${item.name}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>`;
        }
    });

    gridHtml += '</div>';
    container.innerHTML = gridHtml + fullWidthHtml;
}

document.addEventListener("DOMContentLoaded", renderSitemap);
