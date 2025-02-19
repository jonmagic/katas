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
  }
`

const resolvers = {
  Query: {
    users: async (_: unknown, { page }: { page: number }): Promise<User[]> => {
      const start = (page - 1) * 10
      const delay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500 // Random delay between 500ms - 1000ms

      console.log(`Simulating ${delay}ms delay for users query...`)
      await new Promise(resolve => setTimeout(resolve, delay)) // Introduce artificial delay

      return users.slice(start, start + 10)
    },
    user: async (_: unknown, { username }: { username: string }): Promise<User | undefined> => {
      const delay = Math.floor(Math.random() * (3000 - 500 + 1)) + 500 // Random delay

      console.log(`Simulating ${delay}ms delay for user query (username: ${username})...`)
      await new Promise(resolve => setTimeout(resolve, delay)) // Introduce artificial delay

      return users.find(u => u.username === username)
    }
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
