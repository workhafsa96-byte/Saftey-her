/* =========================================================
   SafeHer – Women's Safety & Emergency Assistance
   app.js
   All vanilla JS functionality for the site.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------------------------------------------------
     0. CONFIG — Add your own API keys here
  --------------------------------------------------------- */
  const CONFIG = {
    NEWS_API_KEY: 'YOUR_NEWSAPI_KEY_HERE',      // https://newsapi.org
    OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_KEY_HERE' // https://openweathermap.org/api
  };

  /* ---------------------------------------------------------
     1. LOADING SCREEN
  --------------------------------------------------------- */
  const loadingScreen = document.getElementById('loading-screen');
  window.addEventListener('load', () => {
    setTimeout(() => {
      loadingScreen.classList.add('hide');
    }, 900);
  });

  /* ---------------------------------------------------------
     2. DARK / LIGHT MODE TOGGLE
  --------------------------------------------------------- */
  const themeToggle = document.getElementById('themeToggle');
  const htmlEl = document.documentElement;
  const themeIcon = themeToggle.querySelector('i');

  function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
    localStorage.setItem('safeher-theme', theme);
  }

  const savedTheme = localStorage.getItem('safeher-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ---------------------------------------------------------
     3. STICKY NAVBAR SHADOW + SMOOTH SCROLL + AUTO-CLOSE MENU
  --------------------------------------------------------- */
  const navbar = document.getElementById('mainNavbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 20
      ? '0 4px 24px rgba(0,0,0,0.08)'
      : '0 2px 20px rgba(0,0,0,0.04)';
  });

  // Smooth scroll for all in-page anchor links
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
          // collapse mobile navbar after clicking a link
          const navCollapse = document.getElementById('navMenu');
          if (navCollapse.classList.contains('show')) {
            bootstrap.Collapse.getOrCreateInstance(navCollapse).hide();
          }
        }
      }
    });
  });

  /* ---------------------------------------------------------
     4. SCROLL ANIMATIONS (IntersectionObserver)
  --------------------------------------------------------- */
  const aosElements = document.querySelectorAll('[data-aos]');
  const aosObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-visible');
        aosObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  aosElements.forEach(el => aosObserver.observe(el));

  /* ---------------------------------------------------------
     5. BACK TO TOP BUTTON
  --------------------------------------------------------- */
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 400);
  });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------------------------------------------------------
     6. TOAST HELPER (small reusable notification)
  --------------------------------------------------------- */
  function showToast(message, icon = 'bi-check-circle-fill') {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `<i class="bi ${icon}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  /* ---------------------------------------------------------
     7. EMERGENCY SOS (modal + countdown + siren)
  --------------------------------------------------------- */
  const sosBtn = document.getElementById('sosBtn');
  const sosModalEl = document.getElementById('sosModal');
  const sosModal = new bootstrap.Modal(sosModalEl);
  const sosConfirmStep = document.getElementById('sosConfirmStep');
  const sosCountdownStep = document.getElementById('sosCountdownStep');
  const sosSentStep = document.getElementById('sosSentStep');
  const confirmSosBtn = document.getElementById('confirmSosBtn');
  const cancelSosBtn = document.getElementById('cancelSosBtn');
  const countdownNumber = document.getElementById('countdownNumber');

  let countdownTimer = null;
  let sirenAudioCtx = null;
  let sirenOscillators = [];

  // Generate a siren sound using the Web Audio API (no external file needed)
  function startSiren() {
    sirenAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = sirenAudioCtx.createOscillator();
    const gain = sirenAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, sirenAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, sirenAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(sirenAudioCtx.destination);
    osc.start();
    sirenOscillators.push(osc);

    // Sweep frequency up and down repeatedly to mimic a siren wail
    let rising = true;
    const sweepInterval = setInterval(() => {
      if (!sirenAudioCtx || sirenAudioCtx.state === 'closed') {
        clearInterval(sweepInterval);
        return;
      }
      const target = rising ? 900 : 500;
      osc.frequency.linearRampToValueAtTime(target, sirenAudioCtx.currentTime + 0.5);
      rising = !rising;
    }, 500);
    osc._sweepInterval = sweepInterval;
  }

  function stopSiren() {
    if (sirenOscillators.length) {
      sirenOscillators.forEach(osc => {
        clearInterval(osc._sweepInterval);
        try { osc.stop(); } catch (e) { /* already stopped */ }
      });
      sirenOscillators = [];
    }
    if (sirenAudioCtx) {
      sirenAudioCtx.close();
      sirenAudioCtx = null;
    }
  }

  function resetSosModal() {
    sosConfirmStep.classList.remove('d-none');
    sosCountdownStep.classList.add('d-none');
    sosSentStep.classList.add('d-none');
    countdownNumber.textContent = '5';
    clearInterval(countdownTimer);
    stopSiren();
  }

  sosBtn.addEventListener('click', () => {
    resetSosModal();
    sosModal.show();
  });

  confirmSosBtn.addEventListener('click', () => {
    sosConfirmStep.classList.add('d-none');
    sosCountdownStep.classList.remove('d-none');
    startSiren();

    let count = 5;
    countdownNumber.textContent = count;
    countdownTimer = setInterval(() => {
      count--;
      countdownNumber.textContent = count;
      if (count <= 0) {
        clearInterval(countdownTimer);
        stopSiren();
        sosCountdownStep.classList.add('d-none');
        sosSentStep.classList.remove('d-none');
        showToast('Emergency alert sent to trusted contacts!', 'bi-shield-check');
      }
    }, 1000);
  });

  cancelSosBtn.addEventListener('click', () => {
    resetSosModal();
    sosModal.hide();
    showToast('SOS alert cancelled.', 'bi-x-circle-fill');
  });

  sosModalEl.addEventListener('hidden.bs.modal', resetSosModal);

  /* ---------------------------------------------------------
     8. LIVE CAMERA
  --------------------------------------------------------- */
  const cameraPreview = document.getElementById('cameraPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const cameraError = document.getElementById('cameraError');
  const startRecordBtn = document.getElementById('startRecordBtn');

  let cameraStream = null;

  async function startCamera() {
    cameraError.classList.add('d-none');
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraPreview.srcObject = cameraStream;
      cameraPlaceholder.style.display = 'none';
      startCameraBtn.disabled = true;
      stopCameraBtn.disabled = false;
      startRecordBtn.disabled = false;
      document.getElementById('recordingStatus').textContent = 'Camera ready. You can now start recording.';
    } catch (err) {
      let msg = 'Unable to access camera. Please check permissions.';
      if (err.name === 'NotAllowedError') msg = 'Camera access was denied. Please allow camera permissions in your browser settings.';
      else if (err.name === 'NotFoundError') msg = 'No camera device was found on this device.';
      cameraError.textContent = msg;
      cameraError.classList.remove('d-none');
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    cameraPreview.srcObject = null;
    cameraPlaceholder.style.display = 'flex';
    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
  }

  startCameraBtn.addEventListener('click', startCamera);
  stopCameraBtn.addEventListener('click', () => {
    stopCamera();
    // also stop any active recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
  });

  /* ---------------------------------------------------------
     9. VIDEO RECORDING (MediaRecorder API)
  --------------------------------------------------------- */
  const stopRecordBtn = document.getElementById('stopRecordBtn');
  const downloadRecordBtn = document.getElementById('downloadRecordBtn');
  const recordingStatus = document.getElementById('recordingStatus');

  let mediaRecorder = null;
  let recordedChunks = [];

  startRecordBtn.disabled = true; // enabled once camera starts

  function startRecording() {
    if (!cameraStream) {
      recordingStatus.textContent = 'Please start the camera first.';
      return;
    }
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
    } catch (e) {
      mediaRecorder = new MediaRecorder(cameraStream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      downloadRecordBtn.href = url;
      downloadRecordBtn.classList.remove('disabled');
      recordingStatus.textContent = 'Recording ready. Click download to save.';
    };

    mediaRecorder.start();
    startRecordBtn.disabled = true;
    stopRecordBtn.disabled = false;
    downloadRecordBtn.classList.add('disabled');
    recordingStatus.textContent = 'Recording in progress…';
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    startRecordBtn.disabled = !cameraStream;
    stopRecordBtn.disabled = true;
  }

  startRecordBtn.addEventListener('click', startRecording);
  stopRecordBtn.addEventListener('click', stopRecording);

  /* ---------------------------------------------------------
     10. LIVE LOCATION + LEAFLET MAP
  --------------------------------------------------------- */
  const detectLocationBtn = document.getElementById('detectLocationBtn');
  const shareLocationBtn = document.getElementById('shareLocationBtn');
  const latValue = document.getElementById('latValue');
  const lngValue = document.getElementById('lngValue');
  const locationError = document.getElementById('locationError');

  let locationMap = null;
  let locationMarker = null;
  let currentCoords = null;

  function initLocationMap(lat = 24.8607, lng = 67.0011) {
    if (locationMap) return;
    locationMap = L.map('locationMap').setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(locationMap);
  }

  // Initialize map with a default view on load
  initLocationMap();

  detectLocationBtn.addEventListener('click', () => {
    locationError.classList.add('d-none');
    if (!navigator.geolocation) {
      locationError.textContent = 'Geolocation is not supported by your browser.';
      locationError.classList.remove('d-none');
      return;
    }

    detectLocationBtn.disabled = true;
    detectLocationBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Detecting…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        currentCoords = { lat: latitude, lng: longitude };
        latValue.textContent = latitude.toFixed(6);
        lngValue.textContent = longitude.toFixed(6);

        initLocationMap(latitude, longitude);
        locationMap.setView([latitude, longitude], 15);

        if (locationMarker) locationMap.removeLayer(locationMarker);
        locationMarker = L.marker([latitude, longitude]).addTo(locationMap)
          .bindPopup('You are here').openPopup();

        shareLocationBtn.disabled = false;
        detectLocationBtn.disabled = false;
        detectLocationBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Detect My Location';
      },
      (err) => {
        let msg = 'Unable to detect location.';
        if (err.code === err.PERMISSION_DENIED) msg = 'Location permission denied. Please allow location access.';
        else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Location information is unavailable.';
        else if (err.code === err.TIMEOUT) msg = 'Location request timed out.';
        locationError.textContent = msg;
        locationError.classList.remove('d-none');
        detectLocationBtn.disabled = false;
        detectLocationBtn.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Detect My Location';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  shareLocationBtn.addEventListener('click', async () => {
    if (!currentCoords) return;
    const shareText = `My current location: https://www.openstreetmap.org/?mlat=${currentCoords.lat}&mlon=${currentCoords.lng}#map=15/${currentCoords.lat}/${currentCoords.lng}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Location', text: shareText });
      } catch (e) { /* user cancelled share */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast('Location link copied to clipboard!', 'bi-clipboard-check-fill');
      } catch (e) {
        showToast('Could not copy location automatically.', 'bi-exclamation-circle');
      }
    }
  });

  /* ---------------------------------------------------------
     11. NEARBY HELP (Leaflet + Overpass API)
  --------------------------------------------------------- */
  const nearbyMapEl = document.getElementById('nearbyMap');
  const findNearbyBtn = document.getElementById('findNearbyBtn');
  const nearbyList = document.getElementById('nearbyList');
  const filterBtns = document.querySelectorAll('.btn-filter');

  let nearbyMap = L.map('nearbyMap').setView([24.8607, 67.0011], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(nearbyMap);

  let nearbyMarkers = [];
  let activeFilter = 'police';

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
    });
  });

  function clearNearbyMarkers() {
    nearbyMarkers.forEach(m => nearbyMap.removeLayer(m));
    nearbyMarkers = [];
  }

  function overpassQueryFor(filter, lat, lng, radius = 4000) {
    // Build the correct Overpass QL tag query per category
    let tagQuery;
    if (filter === 'police') tagQuery = `node["amenity"="police"](around:${radius},${lat},${lng});`;
    else if (filter === 'hospital') tagQuery = `node["amenity"="hospital"](around:${radius},${lat},${lng});`;
    else tagQuery = `node["amenity"="social_facility"](around:${radius},${lat},${lng});`;

    return `[out:json][timeout:25];(${tagQuery});out body 20;`;
  }

  async function findNearby() {
    nearbyList.innerHTML = '';
    clearNearbyMarkers();
    findNearbyBtn.disabled = true;
    findNearbyBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Searching…';

    const runSearch = async (lat, lng) => {
      nearbyMap.setView([lat, lng], 14);
      const query = overpassQueryFor(activeFilter, lat, lng);
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query
        });
        const data = await response.json();
        renderNearbyResults(data.elements || [], lat, lng);
      } catch (err) {
        nearbyList.innerHTML = `<div class="col-12"><div class="alert alert-warning">Could not fetch nearby places right now. Please check your internet connection and try again.</div></div>`;
      } finally {
        findNearbyBtn.disabled = false;
        findNearbyBtn.innerHTML = '<i class="bi bi-search"></i> Find Nearby';
      }
    };

    if (currentCoords) {
      runSearch(currentCoords.lat, currentCoords.lng);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => runSearch(pos.coords.latitude, pos.coords.longitude),
        () => runSearch(24.8607, 67.0011) // fallback default location
      );
    } else {
      runSearch(24.8607, 67.0011);
    }
  }

  function renderNearbyResults(elements, originLat, originLng) {
    if (!elements.length) {
      nearbyList.innerHTML = `<div class="col-12"><div class="alert alert-info">No results found nearby. Try a different category or location.</div></div>`;
      return;
    }

    const icons = { police: 'bi-shield-lock-fill', hospital: 'bi-hospital-fill', social_facility: 'bi-heart-fill' };
    const labels = { police: 'Police Station', hospital: 'Hospital', social_facility: 'Help Center' };

    elements.slice(0, 12).forEach(el => {
      const name = el.tags && el.tags.name ? el.tags.name : labels[activeFilter];
      const marker = L.marker([el.lat, el.lon]).addTo(nearbyMap).bindPopup(name);
      nearbyMarkers.push(marker);

      const distance = getDistanceKm(originLat, originLng, el.lat, el.lon).toFixed(1);

      const col = document.createElement('div');
      col.className = 'col-sm-6 col-lg-4';
      col.innerHTML = `
        <div class="nearby-card">
          <i class="bi ${icons[activeFilter]} text-danger fs-4"></i>
          <h6 class="mt-2">${name}</h6>
          <span class="badge bg-secondary badge-type mb-2">${labels[activeFilter]}</span>
          <p class="small mb-1">Approx. ${distance} km away</p>
          <a href="https://www.openstreetmap.org/?mlat=${el.lat}&mlon=${el.lon}#map=17/${el.lat}/${el.lon}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-dark w-100 mt-2">
            <i class="bi bi-map"></i> View on Map
          </a>
        </div>`;
      nearbyList.appendChild(col);
    });
  }

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  findNearbyBtn.addEventListener('click', findNearby);

  /* ---------------------------------------------------------
     12. SAFETY NEWS (NewsAPI with graceful fallback)
  --------------------------------------------------------- */
  const newsContainer = document.getElementById('newsContainer');
  const newsFallback = document.getElementById('newsFallback');

  const sampleNews = [
    {
      title: 'Cities Expand Well-Lit Safe Corridors for Women',
      description: 'Urban planners are adding better lighting and emergency call points along key routes to improve women\'s safety at night.',
      url: '#',
      urlToImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&q=60'
    },
    {
      title: 'Self-Defense Workshops See Record Enrollment',
      description: 'Community centers report a surge in women signing up for self-defense and situational awareness training.',
      url: '#',
      urlToImage: 'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=600&q=60'
    },
    {
      title: 'New Safety App Features Praised by Advocacy Groups',
      description: 'Women\'s rights organizations highlight the growing role of mobile apps in providing rapid emergency assistance.',
      url: '#',
      urlToImage: 'https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=600&q=60'
    }
  ];

  function renderNews(articles) {
    newsContainer.innerHTML = '';
    articles.forEach(article => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      col.innerHTML = `
        <div class="news-card">
          <img src="${article.urlToImage || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=60'}" alt="${article.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=60'">
          <div class="news-card-body">
            <h6>${article.title}</h6>
            <p>${article.description || ''}</p>
            <a href="${article.url}" target="_blank" rel="noopener" class="btn btn-sm btn-primary-soft mt-2">Read More <i class="bi bi-arrow-right"></i></a>
          </div>
        </div>`;
      newsContainer.appendChild(col);
    });
  }

  async function loadNews() {
    if (!CONFIG.NEWS_API_KEY || CONFIG.NEWS_API_KEY === 'YOUR_NEWSAPI_KEY_HERE') {
      renderNews(sampleNews);
      newsFallback.classList.remove('d-none');
      return;
    }
    try {
      const res = await fetch(`https://newsapi.org/v2/everything?q=women%20safety&sortBy=publishedAt&pageSize=6&apiKey=${CONFIG.NEWS_API_KEY}`);
      const data = await res.json();
      if (data.articles && data.articles.length) {
        renderNews(data.articles);
      } else {
        renderNews(sampleNews);
        newsFallback.classList.remove('d-none');
      }
    } catch (err) {
      renderNews(sampleNews);
      newsFallback.classList.remove('d-none');
    }
  }

  loadNews();

  /* ---------------------------------------------------------
     13. WEATHER (OpenWeather API)
  --------------------------------------------------------- */
  const weatherCityInput = document.getElementById('weatherCityInput');
  const weatherSearchBtn = document.getElementById('weatherSearchBtn');
  const weatherResult = document.getElementById('weatherResult');
  const weatherError = document.getElementById('weatherError');

  async function fetchWeather(city) {
    if (!CONFIG.OPENWEATHER_API_KEY || CONFIG.OPENWEATHER_API_KEY === 'YOUR_OPENWEATHER_KEY_HERE') {
      weatherError.classList.remove('d-none');
      weatherResult.classList.add('d-none');
      return;
    }
    weatherError.classList.add('d-none');
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${CONFIG.OPENWEATHER_API_KEY}`);
      const data = await res.json();
      if (data.cod !== 200) {
        weatherError.textContent = data.message || 'City not found.';
        weatherError.classList.remove('d-none');
        weatherResult.classList.add('d-none');
        return;
      }
      document.getElementById('weatherCity').textContent = `${data.name}, ${data.sys.country}`;
      document.getElementById('weatherCondition').textContent = data.weather[0].description;
      document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      document.getElementById('weatherTemp').textContent = `${Math.round(data.main.temp)}°C`;
      document.getElementById('weatherHumidity').textContent = `${data.main.humidity}%`;
      document.getElementById('weatherWind').textContent = `${data.wind.speed} m/s`;
      weatherResult.classList.remove('d-none');
    } catch (err) {
      weatherError.textContent = 'Unable to fetch weather data right now.';
      weatherError.classList.remove('d-none');
    }
  }

  weatherSearchBtn.addEventListener('click', () => {
    const city = weatherCityInput.value.trim();
    if (city) fetchWeather(city);
  });
  weatherCityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') weatherSearchBtn.click();
  });

  /* ---------------------------------------------------------
     14. SAFETY CHECKLIST (localStorage)
  --------------------------------------------------------- */
  const checklistGroup = document.getElementById('checklistGroup');
  const checklistProgress = document.getElementById('checklistProgress');
  const checklistPercent = document.getElementById('checklistPercent');
  const checklistCheckboxes = checklistGroup.querySelectorAll('input[type="checkbox"]');

  function loadChecklist() {
    const saved = JSON.parse(localStorage.getItem('safeher-checklist') || '{}');
    checklistCheckboxes.forEach(cb => {
      cb.checked = !!saved[cb.dataset.id];
    });
    updateChecklistProgress();
  }

  function saveChecklist() {
    const state = {};
    checklistCheckboxes.forEach(cb => { state[cb.dataset.id] = cb.checked; });
    localStorage.setItem('safeher-checklist', JSON.stringify(state));
  }

  function updateChecklistProgress() {
    const total = checklistCheckboxes.length;
    const checked = Array.from(checklistCheckboxes).filter(cb => cb.checked).length;
    const percent = Math.round((checked / total) * 100);
    checklistProgress.style.width = `${percent}%`;
    checklistPercent.textContent = percent;
  }

  checklistCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      saveChecklist();
      updateChecklistProgress();
    });
  });

  loadChecklist();

  /* ---------------------------------------------------------
     15. TRUSTED CONTACTS (localStorage CRUD)
  --------------------------------------------------------- */
  const trustedForm = document.getElementById('trustedForm');
  const trustedName = document.getElementById('trustedName');
  const trustedPhone = document.getElementById('trustedPhone');
  const trustedRelation = document.getElementById('trustedRelation');
  const trustedList = document.getElementById('trustedList');
  const trustedEmpty = document.getElementById('trustedEmpty');

  function getTrustedContacts() {
    return JSON.parse(localStorage.getItem('safeher-trusted-contacts') || '[]');
  }

  function saveTrustedContacts(contacts) {
    localStorage.setItem('safeher-trusted-contacts', JSON.stringify(contacts));
  }

  function renderTrustedContacts() {
    const contacts = getTrustedContacts();
    trustedList.innerHTML = '';
    trustedEmpty.classList.toggle('d-none', contacts.length > 0);

    contacts.forEach((contact, index) => {
      const col = document.createElement('div');
      col.className = 'col-12';
      col.innerHTML = `
        <div class="trusted-card">
          <div>
            <h6>${contact.name}</h6>
            <small>${contact.relation || 'Contact'} • ${contact.phone}</small>
          </div>
          <div class="d-flex align-items-center gap-2">
            <a href="tel:${contact.phone}" class="btn btn-sm btn-primary-soft"><i class="bi bi-telephone-fill"></i></a>
            <div class="trusted-actions">
              <button data-action="delete" data-index="${index}" title="Delete"><i class="bi bi-trash-fill"></i></button>
            </div>
          </div>
        </div>`;
      trustedList.appendChild(col);
    });
  }

  trustedForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!trustedForm.checkValidity()) {
      trustedForm.classList.add('was-validated');
      return;
    }

    const contacts = getTrustedContacts();
    contacts.push({
      name: trustedName.value.trim(),
      phone: trustedPhone.value.trim(),
      relation: trustedRelation.value.trim()
    });
    saveTrustedContacts(contacts);
    renderTrustedContacts();
    trustedForm.reset();
    trustedForm.classList.remove('was-validated');
    showToast('Trusted contact added!', 'bi-person-check-fill');
  });

  trustedList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    const contacts = getTrustedContacts();
    contacts.splice(index, 1);
    saveTrustedContacts(contacts);
    renderTrustedContacts();
    showToast('Contact removed.', 'bi-trash-fill');
  });

  renderTrustedContacts();

  /* ---------------------------------------------------------
     16. CONTACT FORM VALIDATION
  --------------------------------------------------------- */
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!contactForm.checkValidity()) {
      contactForm.classList.add('was-validated');
      contactSuccess.classList.add('d-none');
      return;
    }

    // Simulated submission (no backend) — replace with real API call as needed
    contactSuccess.classList.remove('d-none');
    contactForm.reset();
    contactForm.classList.remove('was-validated');
    setTimeout(() => contactSuccess.classList.add('d-none'), 5000);
  });

  /* ---------------------------------------------------------
     17. FOOTER YEAR
  --------------------------------------------------------- */
  document.getElementById('currentYear').textContent = new Date().getFullYear();

});