import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'
import { init, RematchRootState, RematchDispatch, Models } from '@rematch/core'
import { Provider, useSelector, useDispatch } from 'react-redux'

// Define the pagination model
const pagination = {
  state: { page: 1 }, // initial state
  reducers: {
    nextPage: (state) => ({ page: state.page + 1 }),
    prevPage: (state) => ({ page: Math.max(1, state.page - 1) })
  }
}

// Correctly define RootModel type for Rematch
interface RootModel extends Models<RootModel> {
  pagination: typeof pagination
}

// Initialize the store with correct type constraints
const store = init<RootModel>({
  models: { pagination }
})

// Type definitions for Redux hooks
type RootState = RematchRootState<RootModel>
type Dispatch = RematchDispatch<RootModel>

// Set up Apollo Client
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache()
})

const GET_USERS = gql`
  query GetUsers($page: Int!) {
    users(page: $page) {
      timestamp
      username
      email
      spammy
    }
  }
`

const UserList: React.FC = () => {
  const page = useSelector((state: RootState) => state.pagination.page)
  const dispatch = useDispatch<Dispatch>()

  const { data, loading, error } = useQuery<{ users: any[] }, { page: number }>(GET_USERS, {
    variables: { page },
    fetchPolicy: 'cache-first'
  })

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'j') dispatch.pagination.nextPage()
      if (e.key === 'k') dispatch.pagination.prevPage()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [dispatch])

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>

  return (
    <div style={{ padding: '20px' }}>
      <h2>Users - Page {page}</h2>
      <table border={1} cellPadding="8" cellSpacing="0" style={{ width: '100%', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Timestamp</th>
            <th>Spammy</th>
          </tr>
        </thead>
        <tbody>
          {data?.users.map(user => (
            <tr key={user.username}>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{new Date(user.timestamp).toLocaleString()}</td>
              <td style={{ color: user.spammy ? 'red' : 'green' }}>
                {user.spammy ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Press "j" for next page, "k" for previous page.</p>
    </div>
  )
}

const App: React.FC = () => (
  <Provider store={store}>
    <ApolloProvider client={client}>
      <BrowserRouter>
        <Switch>
          <Route path="/" exact component={UserList} />
        </Switch>
      </BrowserRouter>
    </ApolloProvider>
  </Provider>
)

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
