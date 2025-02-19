import { createYoga, createSchema } from 'graphql-yoga'
import { createServer } from 'http'

interface User {
  timestamp: string
  username: string
  email: string
  spammy: boolean
}

const users: User[] = Array.from({ length: 100 }, (_, i) => ({
  timestamp: new Date().toISOString(),
  username: `user${i + 1}`,
  email: `user${i + 1}@example.com`,
  spammy: Math.random() < 0.5
}))

const typeDefs = /* GraphQL */ `
  type User {
    timestamp: String!
    username: String!
    email: String!
    spammy: Boolean!
  }
  type Query {
    users(page: Int!): [User!]!
    user(username: String!): User
    spammyUsers: [User!]!
  }
`

const resolvers = {
  Query: {
    users: (_: unknown, { page }: { page: number }): User[] => {
      const start = (page - 1) * 10
      return users.slice(start, start + 10)
    },
    user: (_: unknown, { username }: { username: string }): User | undefined =>
      users.find(u => u.username === username),
    spammyUsers: (): User[] => users.filter(u => u.spammy)
  }
}

// Create Yoga instance
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers
  })
})

// Create an HTTP server and pass Yoga as the request handler
const server = createServer(yoga)

server.listen(4000, () => {
  console.log('🚀 GraphQL server running at http://localhost:4000/graphql')
})
