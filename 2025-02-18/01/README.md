# 2025-02-18 01

Set up a simple server and client to test out some theories about upgrading from react 16 to 18. It should have this tech stack:

- server
    - node
    - typescript
    - graphql-yoga
- client
    - vite
    - typescript
    - react
    - react-router
    - apollo client for graphql
    - redux

The server should have mock user data and use random delays in the resolver endpoints to simulate server response delays.

The client should render up to 10 users at a time in a table as well as display a random user above the table powered by a second graphql query. It should use j/k for nav between pages.

## Getting Started

In one terminal window, start the server:

```
cd 2025-02-18/01/server
npm i
npm run dev
```

In another terminal window, start the client:

```
cd 2025-02-18/01/client
npm i
npm run dev
```
