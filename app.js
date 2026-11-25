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

async function getWeather(name) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=ko`
  );
  if (!geoRes.ok) throw new Error("도시 검색에 실패했습니다.");
  const geo = await geoRes.json();
  if (!geo.results || !geo.results.length) throw new Error(`"${name}" 도시를 찾을 수 없습니다.`);
  const { latitude, longitude, name: city, admin1, country } = geo.results[0];

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
  $("status").textContent = "불러오는 중...";
  $("result").hidden = true;
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
