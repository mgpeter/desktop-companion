# ----- Build Stage -----
    FROM node:18 AS builder
    WORKDIR /app
    COPY . .
    RUN npm install
    RUN npm run build  # This creates the /dist directory
    
    # ----- Serve Stage -----
    FROM nginx:alpine
    COPY --from=builder /app/dist/servo-skull.angular /usr/share/nginx/html
    EXPOSE 80
    