export type WeatherSnapshot = {
  place: string
  tempC: number
  condition: string
  humidity: number
  rainChance: number
  source: 'mock' | 'live'
  latitude?: number
  longitude?: number
}

const DEFAULT_SNAPSHOT: WeatherSnapshot = {
  place: 'Pune Region',
  tempC: 32,
  condition: 'Partly cloudy',
  humidity: 58,
  rainChance: 30,
  source: 'mock',
}

export function getCurrentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    )
  })
}

function weatherCodeToText(code: number): string {
  if (code === 0) return 'Clear sky'
  if ([1, 2, 3].includes(code)) return 'Partly cloudy'
  if ([45, 48].includes(code)) return 'Foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67].includes(code)) return 'Rain'
  if ([71, 73, 75, 77].includes(code)) return 'Snow'
  if ([80, 81, 82].includes(code)) return 'Rain showers'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Live weather'
}

export async function fetchWeatherByCoords(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code` +
    `&hourly=precipitation_probability` +
    `&forecast_days=1`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Live weather HTTP ${res.status}`)

  const data = await res.json()
  const current = data.current ?? {}

  const hourlyProb = Array.isArray(data.hourly?.precipitation_probability)
    ? data.hourly.precipitation_probability
    : []

  const rainChance =
    hourlyProb.length > 0
      ? Number(hourlyProb[0] ?? DEFAULT_SNAPSHOT.rainChance)
      : Number(current.precipitation ?? DEFAULT_SNAPSHOT.rainChance)

  return {
    place: 'Current location',
    tempC: Number(current.temperature_2m ?? DEFAULT_SNAPSHOT.tempC),
    condition: weatherCodeToText(Number(current.weather_code ?? 0)),
    humidity: Number(current.relative_humidity_2m ?? DEFAULT_SNAPSHOT.humidity),
    rainChance,
    source: 'live',
    latitude: lat,
    longitude: lon,
  }
}

const WEATHER_ENDPOINT =
  import.meta.env.VITE_WEATHER_ENDPOINT?.toString().trim() ||
  'http://127.0.0.1:8001/api/weather'

export async function fetchWeather(place = DEFAULT_SNAPSHOT.place): Promise<WeatherSnapshot> {
  try {
    const url = `${WEATHER_ENDPOINT}?place=${encodeURIComponent(place)}`
    const res = await fetch(url)

    if (!res.ok) throw new Error(`Weather endpoint HTTP ${res.status}`)

    const data = await res.json()

    return {
      place: String(data.place ?? place),
      tempC: Number(data.temp_c ?? data.tempC ?? DEFAULT_SNAPSHOT.tempC),
      condition: String(data.condition ?? DEFAULT_SNAPSHOT.condition),
      humidity: Number(data.humidity ?? DEFAULT_SNAPSHOT.humidity),
      rainChance: Number(data.rain_chance ?? data.rainChance ?? DEFAULT_SNAPSHOT.rainChance),
      source: data.source === 'live' ? 'live' : 'mock',
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[weather] fallback', err)
    return { ...DEFAULT_SNAPSHOT, place }
  }
}

export async function fetchBestWeather(): Promise<WeatherSnapshot> {
  try {
    const pos = await getCurrentPosition()
    return await fetchWeatherByCoords(pos.lat, pos.lon)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[weather] GPS/live fallback', err)
    return await fetchWeather()
  }
}