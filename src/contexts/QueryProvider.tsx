import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 min — data is fresh, no refetch
      gcTime: 30 * 60 * 1000,      // 30 min — keep in cache
      retry: 2,                     // retry failed requests twice
      refetchOnWindowFocus: false,  // don't spam API on tab switch
    },
  },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export { queryClient }
