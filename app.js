const $ = (id) => document.getElementById(id);

// WMO weather code -> [icon, description]
const WMO = {
  0: ["☀️", "맑음"], 1: ["🌤️", "대체로 맑음"], 2: ["⛅", "부분적으로 흐림"], 3: ["☁️", "흐림"],
  45: ["🌫️", "안개"], 48: ["🌫️", "서리 안개"],
  51: ["🌦️", "약한 이슬비"], 53: ["🌦️", "이슬비"], 55: ["🌦️", "강한 이슬비"],
  56: ["🌧️", "약한 어는 이슬비"], 57: ["🌧️", "강한 어는 이슬비"],
  61: ["🌧️", "약한 비"], 63: ["🌧️", "비"], 65: ["🌧️", "강한 비"],
  66: ["🌧️", "약한 어는 비"], 67: ["🌧️", "강한 어는 비"],
  71: ["🌨️", "약한 눈"], 73: ["🌨️", "눈"], 75: ["❄️", "강한 눈"], 77: ["🌨️", "싸락눈"],
  80: ["🌦️", "약한 소나기"], 81: ["🌧️", "소나기"], 82: ["⛈️", "강한 소나기"],
  85: ["🌨️", "약한 눈 소나기"], 86: ["❄️", "강한 눈 소나기"],
  95: ["⛈️", "뇌우"], 96: ["⛈️", "우박을 동반한 뇌우"], 99: ["⛈️", "강한 우박 뇌우"],
};

// Open-Meteo 지오코딩은 한글 검색이 불안정하므로, 주요 도시는 영문명으로 변환해 검색한다.
const KO_CITIES = {
  서울: "Seoul", 부산: "Busan", 인천: "Incheon", 대구: "Daegu", 대전: "Daejeon", 광주: "Gwangju",
  울산: "Ulsan", 세종: "Sejong", 수원: "Suwon", 성남: "Seongnam", 고양: "Goyang", 용인: "Yongin",
  창원: "Changwon", 청주: "Cheongju", 전주: "Jeonju", 천안: "Cheonan", 포항: "Pohang", 제주: "Jeju",
  제주도: "Jeju", 춘천: "Chuncheon", 강릉: "Gangneung", 여수: "Yeosu", 목포: "Mokpo", 안동: "Andong",
  도쿄: "Tokyo", 오사카: "Osaka", 교토: "Kyoto", 후쿠오카: "Fukuoka", 삿포로: "Sapporo",
  베이징: "Beijing", 상하이: "Shanghai", 홍콩: "Hong Kong", 타이베이: "Taipei", 방콕: "Bangkok",
  하노이: "Hanoi", 싱가포르: "Singapore", 마닐라: "Manila", 자카르타: "Jakarta", 델리: "Delhi",
  두바이: "Dubai", 이스탄불: "Istanbul", 모스크바: "Moscow", 런던: "London", 파리: "Paris",
  베를린: "Berlin", 로마: "Rome", 마드리드: "Madrid", 바르셀로나: "Barcelona", 암스테르담: "Amsterdam",
  빈: "Vienna", 취리히: "Zurich", 뉴욕: "New York", 로스앤젤레스: "Los Angeles", 시카고: "Chicago",
  샌프란시스코: "San Francisco", 시애틀: "Seattle", 토론토: "Toronto", 밴쿠버: "Vancouver",
  시드니: "Sydney", 멜버른: "Melbourne", 카이로: "Cairo", 상파울루: "Sao Paulo",
};

// 가상 도시: API를 호출하지 않고 고정된 날씨를 보여준다.
const VIRTUAL_CITIES = {
  김민재: { temp: 36.5, icon: "❤️", desc: "하트 날씨" },
  한정수: { temp: 36.5, icon: "❤️", desc: "하트 날씨" },
};

async function searchCity(query) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=ko`
  );
  if (!res.ok) throw new Error("도시 검색에 실패했습니다.");
  const data = await res.json();
  const list = data.results || [];
  // 산·하천 등이 아닌 거주지(PPL*)를 우선 선택
  return list.find((r) => /^PPL/.test(r.feature_code || "")) || list[0];
}

async function getWeather(name) {
  const english = KO_CITIES[name.replace(/(특별시|광역시|시)$/, "")] || KO_CITIES[name];
  const found = (english && (await searchCity(english))) || (await searchCity(name));
  if (!found) throw new Error(`"${name}" 도시를 찾을 수 없습니다.`);
  const { latitude, longitude, name: city, admin1, country } = found;

  const params = new URLSearchParams({
    latitude, longitude, timezone: "auto",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
  });
  const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!wRes.ok) throw new Error("날씨 정보를 불러오지 못했습니다.");
  const w = await wRes.json();
  return { place: [city, admin1, country].filter(Boolean).join(", "), c: w.current, u: w.current_units };
}

$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("city").value.trim();
  if (!name) return;
  $("result").hidden = true;
  const virtual = VIRTUAL_CITIES[name];
  if (virtual) {
    $("place").textContent = `${name} (가상 도시)`;
    $("icon").textContent = virtual.icon;
    $("temp").textContent = `${virtual.temp}°C`;
    $("desc").textContent = virtual.desc;
    $("feels").textContent = `${virtual.temp}°C`;
    $("humidity").textContent = "♥";
    $("wind").textContent = "♥";
    $("precip").textContent = "♥";
    $("result").hidden = false;
    $("status").textContent = "";
    return;
  }
  $("status").textContent = "불러오는 중...";
  try {
    const { place, c, u } = await getWeather(name);
    const [icon, desc] = WMO[c.weather_code] || ["❓", "알 수 없음"];
    $("place").textContent = place;
    $("icon").textContent = icon;
    $("temp").textContent = `${Math.round(c.temperature_2m)}${u.temperature_2m}`;
    $("desc").textContent = desc;
    $("feels").textContent = `${Math.round(c.apparent_temperature)}${u.apparent_temperature}`;
    $("humidity").textContent = `${c.relative_humidity_2m}${u.relative_humidity_2m}`;
    $("wind").textContent = `${c.wind_speed_10m} ${u.wind_speed_10m}`;
    $("precip").textContent = `${c.precipitation} ${u.precipitation}`;
    $("result").hidden = false;
    $("status").textContent = "";
  } catch (err) {
    $("status").textContent = err.message;
  }
});
