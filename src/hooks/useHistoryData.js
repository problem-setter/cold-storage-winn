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
      let query = supabase
  .from('cold_storage')
  .select('*')
  .order('created_at', { ascending: true })

if (date) {
  const { startUTC, endUTC } = wibDayRangeToUTC(date)
  query = query
    .gte('created_at', startUTC)
    .lte('created_at', endUTC)
}

const { data, error } = await query


      if (!error) setData(data || [])
      setLoading(false)
    }

    load()
    timer = setInterval(load, refreshMs)

    return () => clearInterval(timer)
  }, [date, refreshMs])

  return { data, loading }
}
