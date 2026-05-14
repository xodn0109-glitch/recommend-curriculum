// ===== 데이터 로딩 =====
const state = { part01: null, part02: null };

async function loadData() {
  const v = Date.now();
  const [p1, p2] = await Promise.all([
    fetch(`data/part01.json?v=${v}`).then(r => r.json()),
    fetch(`data/part02.json?v=${v}`).then(r => r.json()),
  ]);
  state.part01 = p1;
  state.part02 = p2;
  // PART 02를 지역 → 도시 → 대학 구조로 재구성
  state.universities = buildUnivIndex(p2);
}

function buildUnivIndex(records) {
  const byUniv = new Map();
  for (const r of records) {
    if (!byUniv.has(r.university)) {
      byUniv.set(r.university, {
        name: r.university,
        region: r.region,
        city: r.city,
        rows: []
      });
    }
    byUniv.get(r.university).rows.push(r);
  }
  return Array.from(byUniv.values());
}

// ===== 라우터 =====
const app = document.getElementById('app');

function navigate() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  app.scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (parts.length === 0) return renderHome();
  if (parts[0] === 'part01' && parts.length === 1) return renderPart01Index();
  if (parts[0] === 'part01' && parts.length === 2) return renderPart01Major(decodeURIComponent(parts[1]));
  if (parts[0] === 'part02' && parts.length === 1) return renderPart02Index();
  if (parts[0] === 'part02' && parts.length === 2) return renderPart02Univ(decodeURIComponent(parts[1]));
  app.innerHTML = '<div class="empty-state">페이지를 찾을 수 없습니다.</div>';
}

window.addEventListener('hashchange', navigate);

// ===== 홈 =====
function renderHome() {
  const total01 = state.part01.categories.reduce((s, c) => s + c.majors.length, 0);
  const total02 = state.universities.length;
  app.innerHTML = `
    <section class="hero">
      <h1>2028 대입 권장과목 안내</h1>
      <p>2028학년도 대입 모집단위·대학별 권장과목 가이드입니다.<br>
         원하는 진학 정보를 빠르게 찾아보세요.</p>
    </section>

    <div class="entry-cards">
      <a href="#/part01" class="entry-card">
        <span class="card-icon">📊</span>
        <h2>모집단위별 반영과목</h2>
        <p class="card-sub">학과 계열별로 어느 대학에서 어떤 과목을 권장하는지 한눈에 비교</p>
        <span class="card-meta">7개 계열 · ${total01}개 모집단위</span>
      </a>
      <a href="#/part02" class="entry-card">
        <span class="card-icon">🏫</span>
        <h2>대학별 권장과목</h2>
        <p class="card-sub">대학 단위로 모든 모집단위의 핵심·권장과목 상세 확인</p>
        <span class="card-meta">${total02}개 대학</span>
      </a>
    </div>

    <div class="notice-box">
      <strong>📌 이용 안내</strong>
      <ul>
        <li>본 자료는 2025년 9월 30일 대입정보포털 어디가 탑재 기준입니다.</li>
        <li>추후 대학 발표에 따라 내용이 수정될 수 있으니 반드시 모집요강을 확인해주세요.</li>
        <li>상단 검색창에서 대학·학과·과목을 통합 검색할 수 있습니다.</li>
      </ul>
    </div>
  `;
}

// ===== PART 01 인덱스 =====
function renderPart01Index() {
  const sections = state.part01.categories.map(cat => {
    const tiles = cat.majors.map(m => {
      const empty = m.rows.length === 0 ? ' empty' : '';
      return `<a href="#/part01/${encodeURIComponent(m.name)}" class="tile${empty}">
        <span>${m.name}</span><span class="arrow">→</span>
      </a>`;
    }).join('');
    return `<section class="cat-section">
      <h2>${cat.name}</h2>
      <div class="tile-grid">${tiles}</div>
    </section>`;
  }).join('');

  app.innerHTML = `
    <div class="page-header">
      <nav class="breadcrumb">
        <a href="#/">홈</a><span class="sep">›</span>
        <span>모집단위별 반영과목</span>
      </nav>
      <h1>📊 PART 01. 모집단위별 반영과목</h1>
      <p>학과 계열을 선택하면 각 모집단위에서 권장하는 과목과 대학을 한눈에 볼 수 있습니다.</p>
    </div>
    ${sections}
  `;
}

// ===== PART 01 모집단위 상세 =====
function renderPart01Major(majorName) {
  let foundCat = null, found = null;
  for (const cat of state.part01.categories) {
    const m = cat.majors.find(x => x.name === majorName);
    if (m) { foundCat = cat; found = m; break; }
  }
  if (!found) {
    app.innerHTML = '<div class="empty-state">모집단위를 찾을 수 없습니다.</div>';
    return;
  }

  const cols = state.part01.columns || [];
  const rows = found.rows || [];

  // 2단 헤더 생성 (그룹 → 세부)
  // 그룹별 colspan 계산
  const groups = [];
  let cur = null;
  cols.forEach((c, i) => {
    if (!cur || cur.group !== c.group) {
      cur = { group: c.group, count: 1, start: i };
      groups.push(cur);
    } else {
      cur.count++;
    }
  });

  let table = '';
  if (rows.length === 0) {
    table = '<div class="empty-state">자료집에 해당 모집단위 매트릭스가 없거나 데이터가 비어있습니다.</div>';
  } else {
    const headerRow1 = groups.map(g => `<th colspan="${g.count}" style="text-align:center;">${escapeHtml(g.group)}</th>`).join('');
    const headerRow2 = cols.map(c => `<th style="font-weight:500; font-size:13px;">${escapeHtml(c.name) || '&nbsp;'}</th>`).join('');
    const bodyRows = rows.map(r => {
      const cells = r.map((c, i) => {
        if (!c || c === '-') return `<td class="empty-cell">-</td>`;
        return `<td class="mark">${escapeHtml(c)}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    table = `<div class="table-wrap"><table class="matrix"><thead><tr>${headerRow1}</tr><tr>${headerRow2}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  }

  app.innerHTML = `
    <div class="page-header">
      <nav class="breadcrumb">
        <a href="#/">홈</a><span class="sep">›</span>
        <a href="#/part01">모집단위별 반영과목</a><span class="sep">›</span>
        <span>${foundCat.name}</span><span class="sep">›</span>
        <span>${found.name}</span>
      </nav>
      <h1>${found.name}</h1>
      <p>${foundCat.name} 계열의 ${found.name} 모집단위 — 대학별 권장 과목 매트릭스</p>
    </div>
    <div class="notice-box" style="margin-bottom: 24px;">
      <strong>📌 표 보는 법</strong> — 셀에 적힌 대학명은 해당 과목을 권장한다는 뜻입니다. ⁎표시는 일반 선택 과목 이수 후 진로/적성에 맞게 과목 이수를 권장하는 대학입니다.
    </div>
    ${table}
  `;
}

// ===== PART 02 인덱스 =====
function renderPart02Index() {
  // 지역 → 도시 → 대학
  const REGION_ORDER = ['수도권', '강원', '충청', '영남', '호남', '제주'];
  const CITY_ORDER = {
    '수도권': ['서울', '경기', '인천'],
    '강원': ['강원'],
    '충청': ['대전', '세종', '충북', '충남'],
    '영남': ['부산', '대구', '울산', '경북', '경남'],
    '호남': ['광주', '전북', '전남'],
    '제주': ['제주'],
  };

  const grouped = {};
  for (const u of state.universities) {
    const r = u.region || '기타';
    const c = u.city || '기타';
    if (!grouped[r]) grouped[r] = {};
    if (!grouped[r][c]) grouped[r][c] = [];
    grouped[r][c].push(u);
  }

  const sections = REGION_ORDER.filter(r => grouped[r]).map(region => {
    const cities = (CITY_ORDER[region] || Object.keys(grouped[region])).filter(c => grouped[region][c]);
    const cityBlocks = cities.map(city => {
      const tiles = grouped[region][city]
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        .map(u => `<a href="#/part02/${encodeURIComponent(u.name)}" class="tile">
          <span>${escapeHtml(u.name)}</span><span class="arrow">→</span>
        </a>`).join('');
      return `<div class="city-block">
        <h3>${city}</h3>
        <div class="tile-grid">${tiles}</div>
      </div>`;
    }).join('');
    return `<section class="region-block">
      <h2>${region}</h2>
      ${cityBlocks}
    </section>`;
  }).join('');

  app.innerHTML = `
    <div class="page-header">
      <nav class="breadcrumb">
        <a href="#/">홈</a><span class="sep">›</span>
        <span>대학별 권장과목</span>
      </nav>
      <h1>🏫 PART 02. 대학별 권장과목</h1>
      <p>지역별로 정렬된 대학을 선택하면 모집단위별 핵심·권장과목 상세 표를 볼 수 있습니다.</p>
    </div>
    ${sections}
  `;
}

// ===== PART 02 대학 상세 =====
function renderPart02Univ(univName) {
  const u = state.universities.find(x => x.name === univName);
  if (!u) {
    app.innerHTML = '<div class="empty-state">대학을 찾을 수 없습니다.</div>';
    return;
  }

  // 같은 단과대(college)별로 그룹화
  const groups = [];
  let cur = null;
  for (const r of u.rows) {
    const key = r.college || '__no_college__';
    if (!cur || cur.key !== key) {
      cur = { key, college: r.college, rows: [] };
      groups.push(cur);
    }
    cur.rows.push(r);
  }

  // 같은 그룹 안에서 연속된 동일 값을 rowspan으로 병합 (빈 값/'-'는 제외)
  function calcSpans(rows, key) {
    const spans = new Array(rows.length).fill(null);
    let i = 0;
    while (i < rows.length) {
      const val = ((rows[i][key] ?? '') + '').trim();
      const majorVal = ((rows[i]['major'] ?? '') + '').trim();
      const collegeVal = ((rows[i]['college'] ?? '') + '').trim();
      let j = i + 1;
      const mergeable = val && val !== '-';
      if (mergeable) {
        while (j < rows.length && (((rows[j][key] ?? '') + '').trim()) === val) {
          // 키별로 병합 경계를 다르게 둡니다.
          // - major: 경계 없음 (값만 같으면 묶음)
          // - note(비고): 단과대학 경계. 단과대가 비어 있으면 묶지 않음
          // - core/recommended: 학과 경계
          if (key === 'major') {
            // pass
          } else if (key === 'note') {
            const nextCollege = (((rows[j]['college'] ?? '') + '').trim());
            if (!collegeVal || nextCollege !== collegeVal) break;
          } else {
            if ((((rows[j]['major'] ?? '') + '').trim()) !== majorVal) break;
          }
          j++;
        }
      }
      spans[i] = { value: rows[i][key] || '', rowspan: j - i };
      i = j;
    }
    return spans;
  }

  const tableHtml = groups.map(g => {
    const collegeRow = g.college
      ? `<tr class="college-row"><td colspan="4">${escapeHtml(g.college)}</td></tr>`
      : '';
    const majorSpans = calcSpans(g.rows, 'major');
    const coreSpans = calcSpans(g.rows, 'core_subjects');
    const recSpans = calcSpans(g.rows, 'recommended_subjects');
    const noteSpans = calcSpans(g.rows, 'note');

    const rows = g.rows.map((r, idx) => {
      let html = '<tr>';
      const mergedStyle = ' style="vertical-align:top"';
      // 독립 모집단위처럼 단과대학명과 학과명이 같으면 학과 칸을 따로 두지 않고 다음 칸을 확장
      const collegeText = (g.college || '').trim();
      const majorText = (r.major || '').trim();
      const skipMajor = collegeText && majorText && collegeText === majorText;
      if (!skipMajor && majorSpans[idx]) {
        const s = majorSpans[idx];
        const isM = s.rowspan > 1;
        const rowAttr = isM ? ` rowspan="${s.rowspan}"` : '';
        const style = isM ? mergedStyle : '';
        html += `<td${rowAttr}${style}><strong>${escapeHtml(s.value)}</strong></td>`;
      }
      const cs = coreSpans[idx];
      const rs = recSpans[idx];
      // 핵심과 권장이 동일한 값·동일한 행 범위면 colspan으로 한 셀처럼 표시
      const isColspan = cs && rs && cs.value && cs.value === rs.value && cs.rowspan === rs.rowspan;
      // 학과 칸이 빠진 경우 다음 셀에 colspan을 한 칸 더 부여
      const extraCol = skipMajor ? 1 : 0;
      if (isColspan) {
        const isM = cs.rowspan > 1;
        const rowAttr = isM ? ` rowspan="${cs.rowspan}"` : '';
        const cls = isM ? ' class="merged"' : '';
        const style = isM ? mergedStyle : '';
        const totalCols = 2 + extraCol;
        html += `<td colspan="${totalCols}"${rowAttr}${cls}${style}>${formatSubjects(cs.value, 'core')}</td>`;
      } else {
        let appliedExtra = false;
        if (cs) {
          const isM = cs.rowspan > 1;
          const colAttr = extraCol > 0 && !appliedExtra ? ` colspan="${1 + extraCol}"` : '';
          if (colAttr) appliedExtra = true;
          const attr = isM ? ` rowspan="${cs.rowspan}" class="merged"${mergedStyle}` : '';
          html += `<td${colAttr}${attr}>${formatSubjects(cs.value, 'core')}</td>`;
        }
        if (rs) {
          const isM = rs.rowspan > 1;
          const colAttr = extraCol > 0 && !appliedExtra ? ` colspan="${1 + extraCol}"` : '';
          if (colAttr) appliedExtra = true;
          const attr = isM ? ` rowspan="${rs.rowspan}" class="merged"${mergedStyle}` : '';
          html += `<td${colAttr}${attr}>${formatSubjects(rs.value, 'rec')}</td>`;
        }
      }
      if (noteSpans[idx]) {
        const s = noteSpans[idx];
        const isM = s.rowspan > 1;
        const cls = isM ? 'merged note-cell' : 'note-cell';
        const attr = isM ? ` rowspan="${s.rowspan}" class="${cls}"${mergedStyle}` : ` class="${cls}"`;
        html += `<td${attr}>${escapeHtml(s.value || '-')}</td>`;
      }
      html += `</tr>`;
      return html;
    }).join('');
    return collegeRow + rows;
  }).join('');

  app.innerHTML = `
    <div class="page-header">
      <nav class="breadcrumb">
        <a href="#/">홈</a><span class="sep">›</span>
        <a href="#/part02">대학별 권장과목</a><span class="sep">›</span>
        <span>${u.region} · ${u.city}</span><span class="sep">›</span>
        <span>${u.name}</span>
      </nav>
      <h1>${u.name}</h1>
      <p>${u.region} · ${u.city} — 모집단위별 권장과목</p>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="min-width:160px">모집단위</th>
            <th style="min-width:200px">핵심과목</th>
            <th style="min-width:200px">권장과목</th>
            <th style="min-width:160px">비고</th>
          </tr>
        </thead>
        <tbody>${tableHtml}</tbody>
      </table>
    </div>
  `;
}

function formatSubjects(text, type) {
  if (!text || text === '-' || !text.trim()) return '<span class="empty-cell">-</span>';
  // "일반 선택:" / "진로 선택:" 등 소구분이 들어있는 경우 줄바꿈·라벨 처리
  const hasSections = /일반 선택:|진로 선택:/.test(text);
  if (hasSections) {
    const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
    return lines.map(line => {
      const m = line.match(/^(일반 선택|진로 선택)\s*:\s*(.+)$/);
      if (m) {
        return `<div class="subj-section"><span class="subj-label">${m[1]}</span> ${escapeHtml(m[2])}</div>`;
      }
      return `<div>${escapeHtml(line)}</div>`;
    }).join('');
  }
  return escapeHtml(text);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 검색 =====
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchIndex = null;

function buildSearchIndex() {
  const idx = [];
  // PART 01 모집단위
  for (const cat of state.part01.categories) {
    for (const m of cat.majors) {
      idx.push({
        type: 'major',
        label: m.name,
        sub: cat.name,
        href: `#/part01/${encodeURIComponent(m.name)}`,
        keywords: `${m.name} ${cat.name}`
      });
    }
  }
  // PART 02 대학
  for (const u of state.universities) {
    idx.push({
      type: 'univ',
      label: u.name,
      sub: `${u.region} · ${u.city}`,
      href: `#/part02/${encodeURIComponent(u.name)}`,
      keywords: `${u.name} ${u.region} ${u.city}`
    });
  }
  // PART 02 학과 (대학별 학과 항목 검색)
  for (const u of state.universities) {
    for (const r of u.rows) {
      if (r.major) {
        // 학과명에 콤마가 있으면 분리
        const majors = r.major.split(',').map(s => s.trim()).filter(Boolean);
        for (const mj of majors) {
          idx.push({
            type: 'dept',
            label: mj,
            sub: `${u.name} · ${r.college || u.city}`,
            href: `#/part02/${encodeURIComponent(u.name)}`,
            keywords: `${mj} ${u.name}`
          });
        }
      }
    }
  }
  return idx;
}

function performSearch(q) {
  if (!q || q.length < 1) { searchResults.hidden = true; return; }
  const ql = q.trim().toLowerCase();
  if (!searchIndex) searchIndex = buildSearchIndex();

  const matches = searchIndex
    .filter(it => it.keywords.toLowerCase().includes(ql))
    .slice(0, 30);

  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
    searchResults.hidden = false;
    return;
  }

  // 타입별 그룹
  const byType = { major: [], univ: [], dept: [] };
  for (const m of matches) byType[m.type].push(m);

  const labels = { major: '🎯 모집단위', univ: '🏫 대학', dept: '📚 학과' };
  let html = '';
  for (const t of ['major', 'univ', 'dept']) {
    if (byType[t].length === 0) continue;
    html += `<div class="group-label">${labels[t]} (${byType[t].length})</div>`;
    for (const it of byType[t].slice(0, 10)) {
      html += `<a href="${it.href}" data-href="${it.href}">
        <div>${highlight(it.label, ql)}</div>
        <div class="meta">${escapeHtml(it.sub)}</div>
      </a>`;
    }
  }

  searchResults.innerHTML = html;
  searchResults.hidden = false;
}

function highlight(text, q) {
  const escaped = escapeHtml(text);
  const ql = q.toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(ql);
  if (idx === -1) return escaped;
  const before = escapeHtml(text.slice(0, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length));
  return `${before}<mark style="background: linear-gradient(180deg, transparent 60%, rgba(124,92,255,0.3) 60%); padding: 0 2px;">${match}</mark>${after}`;
}

let searchDebounce;
searchInput.addEventListener('input', e => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => performSearch(e.target.value), 100);
});
searchInput.addEventListener('focus', e => {
  if (e.target.value) performSearch(e.target.value);
});
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.hidden = true;
});
searchResults.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a) {
    searchInput.value = '';
    searchResults.hidden = true;
  }
});

// ===== 시작 =====
loadData()
  .then(() => navigate())
  .catch(err => {
    console.error(err);
    app.innerHTML = `<div class="empty-state">데이터를 불러오는 중 오류가 발생했습니다.<br><small>${err.message}</small></div>`;
  });
