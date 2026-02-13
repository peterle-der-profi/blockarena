FROM node:22

WORKDIR /app

COPY package.json package-lock.json ./

# Install all deps, then force-install Linux native binaries for cross-platform build
RUN npm ci
RUN npm install lightningcss-linux-x64-gnu@1.30.2 @tailwindcss/oxide-linux-x64-gnu --save-optional --force

COPY . .

# NEXT_PUBLIC_ vars must be available at build time for Next.js to inline them
ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GRAPHQL_URL

ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
