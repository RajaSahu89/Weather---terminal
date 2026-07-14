(function(){
  const form = document.getElementById('queryForm');
  const input = document.getElementById('cityInput');
  const status = document.getElementById('status');
  const results = document.getElementById('results');
  const cityEcho = document.getElementById('cityEcho');
  const locBtn = document.getElementById('locBtn');

  const WMO = {
    0:['clear sky','☀'],1:['mainly clear','🌤'],2:['partly cloudy','⛅'],3:['overcast','☁'],
    45:['fog','🌫'],48:['rime fog','🌫'],
    51:['light drizzle','🌦'],53:['drizzle','🌦'],55:['dense drizzle','🌧'],
    61:['light rain','🌧'],63:['rain','🌧'],65:['heavy rain','🌧'],
    71:['light snow','🌨'],73:['snow','🌨'],75:['heavy snow','❄'],
    80:['light showers','🌦'],81:['showers','🌧'],82:['violent showers','⛈'],
    95:['thunderstorm','⛈'],96:['thunderstorm + hail','⛈'],99:['severe hail storm','⛈']
  };
  const cond = code => WMO[code] || ['unknown', '❔'];

  function setStatus(msg, isErr){
    status.textContent = msg || '';
    status.classList.toggle('err', !!isErr);
  }

  function renderRows(name, region, tz, cur, daily){
    cityEcho.textContent = `'${name}${region ? ', ' + region : ''}'`;
    const [condText] = cond(cur.weather_code);
    const rows = [
      ['1','temperature', `${Math.round(cur.temperature_2m)}°C`],
      ['2','feels_like', `${Math.round(cur.apparent_temperature)}°C`],
      ['3','condition', condText],
      ['4','humidity', `${cur.relative_humidity_2m}%`],
      ['5','wind_speed', `${Math.round(cur.wind_speed_10m)} km/h`],
    ];

    let html = `<p class="comment">-- current_weather, 1 row matched, timezone ${tz}</p>`;
    html += `<table><thead><tr><th>id</th><th>metric</th><th>value</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      html += `<tr style="animation-delay:${i*0.05}s"><td class="id">${r[0]}</td><td class="metric">${r[1]}</td><td class="val">${r[2]}</td></tr>`;
    });
    html += `</tbody></table>`;
    html += `<p class="footer-line">5 rows returned in ${(0.18 + Math.random()*0.3).toFixed(2)}s</p>`;

    html += `<p class="comment">-- UNION ALL SELECT day, condition, high, low FROM forecast LIMIT 5</p>`;
    html += `<div class="forecast-grid">`;
    daily.time.slice(0,5).forEach((date, i) => {
      const d = new Date(date + 'T00:00:00');
      const label = i === 0 ? 'today' : d.toLocaleDateString('en-US', {weekday:'short'});
      const [ctext, icon] = cond(daily.weather_code[i]);
      html += `<div class="fcard" style="animation-delay:${0.25 + i*0.05}s">
        <div class="day">${label}</div>
        <div class="cond">${icon}<br>${ctext}</div>
        <div class="hi">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="lo">${Math.round(daily.temperature_2m_min[i])}°</div>
      </div>`;
    });
    html += `</div>`;
    html += `<p class="footer-line">5 rows returned · query complete <span class="cursor"></span></p>`;

    results.innerHTML = html;
  }

  async function fetchByCoords(lat, lon, label, region){
    setStatus('-- executing query...');
    results.innerHTML = '';
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('forecast fetch failed');
      const data = await res.json();
      setStatus('');
      renderRows(label, region, data.timezone, data.current, data.daily);
    }catch(err){
      setStatus('-- ERROR: query failed. check connection and retry.', true);
    }
  }

  async function fetchByCity(name){
    setStatus('-- resolving city name...');
    results.innerHTML = '';
    try{
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if(!geoData.results || !geoData.results.length){
        setStatus(`-- ERROR: 0 rows found for city = '${name}'`, true);
        return;
      }
      const place = geoData.results[0];
      await fetchByCoords(place.latitude, place.longitude, place.name, place.admin1);
    }catch(err){
      setStatus('-- ERROR: query failed. check connection and retry.', true);
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if(!val){ setStatus('-- ERROR: city cannot be null', true); return; }
    fetchByCity(val);
  });

  locBtn.addEventListener('click', () => {
    if(!navigator.geolocation){
      setStatus('-- ERROR: geolocation not supported by this client', true);
      return;
    }
    setStatus('-- locating...');
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude, 'current location', ''),
      () => setStatus('-- ERROR: location permission denied', true)
    );
  });

  fetchByCity('Kolkata');
})();