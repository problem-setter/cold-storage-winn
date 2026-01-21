import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { wibDayRangeToUTC } from '../utils/time'

export function useHistoryData(date = null, refreshMs = 10000) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let timer

    async function load() {
      setLoading(true)
      
      try {
        const PAGE_LIMIT = 1000
        let allData = []
        let from = 0
        let done = false

        while (!done) {
          let query = supabase
            .from('cold_storage')
            .select('*')
            .order('created_at', { ascending: true })
            .range(from, from + PAGE_LIMIT - 1)

          if (date) {
            const { startUTC, endUTC } = wibDayRangeToUTC(date)
            query = query
              .gte('created_at', startUTC)
              .lte('created_at', endUTC)
          }

          const { data: pageData, error } = await query

          if (error) throw error

          allData.push(...(pageData || []))

          if ((pageData || []).length < PAGE_LIMIT) done = true
          else from += PAGE_LIMIT
        }

        console.log('✅ useHistoryData: Total rows fetched:', allData.length)
        setData(allData)
      } catch (err) {
        console.error('❌ useHistoryData error:', err)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    load()
    timer = setInterval(load, refreshMs)

    return () => clearInterval(timer)
  }, [date, refreshMs])

  return { data, loading }
}
