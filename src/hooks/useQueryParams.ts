const useQueryParams = () => {
  if (typeof window === 'undefined') return {}
  const urlSearchParams = new URLSearchParams(window.location.search)
  return Object.fromEntries(urlSearchParams.entries())
}

export default useQueryParams
