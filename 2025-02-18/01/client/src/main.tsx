import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ApolloProvider, ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'
import { init, RematchRootState, RematchDispatch, Models } from '@rematch/core'
import { Provider, useSelector, useDispatch, shallowEqual } from 'react-redux'

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
  .prefetch-container {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
  }
  .prefetch-bar {
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }
`
const styleElement = document.createElement('style')
styleElement.innerHTML = styles
document.head.appendChild(styleElement)

// Define Redux models
const pagination = {
  state: {
    page: 1,
    // selectedUser will be randomly set from the pre-fetched id space
    selectedUser: 'user50',
    refreshUser: 0 // trigger for refreshing the selected user
  },
  reducers: {
    nextPage: (state) => ({
      ...state,
      page: state.page + 1,
      refreshUser: state.refreshUser + 1
    }),
    prevPage: (state) => ({
      ...state,
      page: Math.max(1, state.page - 1),
      refreshUser: state.refreshUser + 1
    }),
    setSelectedUser: (state, selectedUser: string) => ({ ...state, selectedUser }),
    refreshRandomUser: (state) => ({ ...state, refreshUser: state.refreshUser + 1 })
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

// Set up Apollo Client with type policies for normalized caching.
const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      // Define the cache key for User using username.
      User: {
        keyFields: ['username']
      },
      Query: {
        fields: {
          // For the "user" field, read the object from the cache if it exists.
          user: {
            keyArgs: ['username'],
            read(existing, { args, toReference }) {
              // If the user already exists in the cache, return its reference.
              return existing || toReference({ __typename: 'User', username: args!.username })
            }
          }
        }
      }
    }
  })
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

const GET_USER_BY_USERNAME = gql`
  query GetUserByUsername($username: String!) {
    user(username: $username) {
      username
      email
      timestamp
      spammy
    }
  }
`

// Prefetcher component: pre-fetch pages 1–10 and show status bars
const PreFetcher: React.FC = () => {
  const [prefetchStatuses, setPrefetchStatuses] = React.useState<
    { page: number; status: 'pending' | 'complete' }[]
  >(
    Array.from({ length: 10 }, (_, i) => ({
      page: i + 1,
      status: 'pending'
    }))
  )

  React.useEffect(() => {
    prefetchStatuses.forEach(prefetch => {
      client
        .query({
          query: GET_USERS,
          variables: { page: prefetch.page },
          fetchPolicy: 'network-only'
        })
        .then(() => {
          setPrefetchStatuses(prev =>
            prev.map(p => (p.page === prefetch.page ? { ...p, status: 'complete' } : p))
          )
          setTimeout(() => {
            setPrefetchStatuses(prev => prev.filter(p => p.page !== prefetch.page))
          }, 500)
        })
        .catch(err => {
          console.error('Prefetch error for page', prefetch.page, err)
        })
    })
  }, [])

  if (prefetchStatuses.length === 0) return null

  return (
    <div>
      <h3>Prefetch Status:</h3>
      <div className="prefetch-container">
        {prefetchStatuses.map(p => (
          <div
            key={p.page}
            className="prefetch-bar"
            style={{ backgroundColor: p.status === 'pending' ? 'red' : 'green' }}
            title={`Page ${p.page}`}
          />
        ))}
      </div>
    </div>
  )
}

// RandomUser now picks a random user from the pre-fetched id space.
// It uses Redux to store the selected user. The query is executed with cache-first.
const RandomUser: React.FC = () => {
  const { selectedUser, refreshUser } = useSelector(
    (state: RootState) => ({
      selectedUser: state.pagination.selectedUser,
      refreshUser: state.pagination.refreshUser
    }),
    shallowEqual
  )
  const dispatch = useDispatch<Dispatch>()

  // When refreshUser changes, pick a random user ID between 1 and 100 and update Redux
  React.useEffect(() => {
    const randomId = Math.floor(Math.random() * 100) + 1
    const randomUsername = `user${randomId}`
    dispatch.pagination.setSelectedUser(randomUsername)
  }, [refreshUser, dispatch])

  const { data, loading, error } = useQuery(GET_USER_BY_USERNAME, {
    variables: { username: selectedUser },
    fetchPolicy: 'cache-first'
  })

  if (loading) return <p>Loading selected user...</p>
  if (error) return <p>Error: {error.message}</p>
  if (!data?.user) return <p>No user found.</p>

  const { username, email, timestamp, spammy } = data.user

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
  const page = useSelector((state: RootState) => state.pagination.page, shallowEqual)
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
          <PreFetcher />
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
