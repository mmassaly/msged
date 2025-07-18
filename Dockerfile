# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/engine/reference/builder/

ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.


# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --include=dev
    
#npm install --build-from-source This will trigger a fresh compilation of dependencies like bcrypt, sharp, or other native modules.
# Copy the rest of the source files into the image.
COPY . /app
WORKDIR /app
# Run the application as a non-root user.

# Expose the port that the application listens on.
EXPOSE 3039

# Run the application in dev mode to use with Compose watch feature
CMD ["node", "server"]
