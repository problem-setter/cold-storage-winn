import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { wibDayRangeToUTC } from '../utils/time'

// Helper untuk get range berdasarkan period
function getDateRange(dateISO, periodType) {
  const d = new Date(dateISO + 'T00:00:00')
  let startDate, endDate

  if (periodType === 'hour') {
    startDate = dateISO
    endDate = dateISO
  } else if (periodType === 'day') {
    const dayOfWeek = d.getDay()
    const diff = d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    const monday = new Date(d)
    monday.setDate(diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    startDate = monday.toISOString().split('T')[0]
    endDate = sunday.toISOString().split('T')[0]
  } else if (periodType === 'week') {
    startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    endDate = lastDay.toISOString().split('T')[0]
  } else if (periodType === 'month') {
    startDate = `${d.getFullYear()}-01-01`
    endDate = `${d.getFullYear()}-12-31`
  }

  return { startDate, endDate }
}

export function useHistoryData(date = null, refreshMs = 10000, period = 'hour') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let timer
    let isFirstLoad = true

    async function load() {
      try {
        if (isFirstLoad) setLoading(true)
        else setRefreshing(true)

        const PAGE_LIMIT = 1000
        let allData = []
        let from = 0
        let done = false

        const { startDate, endDate } = getDateRange(date, period)

        while (!done) {
          let query = supabase
            .from('cold_storage')
            .select('*')
            .order('created_at', { ascending: true })
            .range(from, from + PAGE_LIMIT - 1)

          if (date) {
            const { startUTC } = wibDayRangeToUTC(startDate)
            const { endUTC } = wibDayRangeToUTC(endDate)
            query = query.gte('created_at', startUTC).lte('created_at', endUTC)
          }

          const { data: pageData, error } = await query
          if (error) throw error

          allData.push(...(pageData || []))
          if ((pageData || []).length < PAGE_LIMIT) done = true
          else from += PAGE_LIMIT
        }

        setData(allData)
      } catch (err) {
        console.error('❌ useHistoryData error:', err)
      } finally {
        setLoading(false)
        setRefreshing(false)
        isFirstLoad = false
      }
    }

    load()
    timer = setInterval(load, refreshMs)
    return () => clearInterval(timer)
  }, [date, refreshMs, period])

  return { data, loading, refreshing }
}
