import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'
import { init, RematchRootState, RematchDispatch, Models } from '@rematch/core'
import { Provider, useSelector, useDispatch } from 'react-redux'

// Inject CSS directly into the document
const styles = `
  .random-user {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background-color: #f3f3f3;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 1rem;
    font-weight: bold;
  }

  .user-info {
    padding: 8px 12px;
    border-radius: 6px;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .spammy {
    color: red;
  }

  .not-spammy {
    color: green;
  }
`

const styleElement = document.createElement('style')
styleElement.innerHTML = styles
document.head.appendChild(styleElement)

// Define Redux models
const pagination = {
  state: { page: 1, randomUser: null, refreshUser: 0 }, // Track refresh signal
  reducers: {
    nextPage: (state) => ({ ...state, page: state.page + 1, refreshUser: state.refreshUser + 1 }),
    prevPage: (state) => ({ ...state, page: Math.max(1, state.page - 1), refreshUser: state.refreshUser + 1 }),
    setRandomUser: (state, randomUser) => ({ ...state, randomUser }),
    refreshRandomUser: (state) => ({ ...state, refreshUser: state.refreshUser + 1 }) // Trigger user refresh
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
      username
      email
      timestamp
      spammy
    }
  }
`

const GET_RANDOM_USER = gql`
  query GetRandomUser($username: String!) {
    user(username: $username) {
      username
      email
      timestamp
      spammy
    }
  }
`

const RandomUser: React.FC = () => {
  const dispatch = useDispatch<Dispatch>()
  const { randomUser, refreshUser } = useSelector((state: RootState) => ({
    randomUser: state.pagination.randomUser,
    refreshUser: state.pagination.refreshUser // Triggers when the page changes
  }))

  React.useEffect(() => {
    const randomUsername = `user${Math.floor(Math.random() * 100) + 1}`
    client
      .query({ query: GET_RANDOM_USER, variables: { username: randomUsername }, fetchPolicy: 'no-cache' })
      .then(response => {
        if (response.data?.user) {
          dispatch.pagination.setRandomUser(response.data.user)
        }
      })
  }, [refreshUser, dispatch]) // Re-fetch when `refreshUser` changes

  if (!randomUser) return <p>Loading random user...</p>

  const { username, email, timestamp, spammy } = randomUser

  return (
    <div className="random-user">
      <div className="user-info">{username}</div>
      <div className="user-info">{email}</div>
      <div className="user-info">{new Date(timestamp).toLocaleString()}</div>
      <div className={`user-info ${spammy ? 'spammy' : 'not-spammy'}`}>
        {spammy ? 'Spammy' : 'Not Spammy'}
      </div>
    </div>
  )
}

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
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
          <RandomUser />
          <Switch>
            <Route path="/" exact component={UserList} />
          </Switch>
        </div>
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
