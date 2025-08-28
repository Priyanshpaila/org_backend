# Use a lightweight Node.js base image
FROM node:20-alpine

# ---- OS packages needed by headless Chrome ----
# chromium: the browser
# nss, freetype, harfbuzz, ca-certificates: shared libs Chrome needs
# ttf-freefont: basic fonts so text doesn't render as tofu
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

# Tell Puppeteer to use the system Chromium and NOT download its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=1

# App env (you can still override at runtime with --env or --env-file)
ENV PORT=5000
ENV MONGO_URI=mongodb://192.168.13.84/orgmanagement
ENV JWT_SECRET=yehmerascerectkeyhaikisikonahibataunga69

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
# Use npm ci for reproducible installs; omit dev deps in production
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Expose application port
EXPOSE ${PORT}

# Start the server
CMD ["node", "src/server.js"]


# docker build  --no-cache -t 192.168.13.72:5000/orgmatrix_be .      
# docker run -d --name orgmatrix_be -p 5000:5000 orgmatrix_be_image

# docker tag orgmatrix_be_image 192.168.13.72:5000/orgmatrix_be
# docker push 192.168.13.72:5000/orgmatrix_be
# docker pull 192.168.13.72:5000/orgmatrix_be
# docker run -d --name orgmatrix_be -p 5000:5000 192.168.13.72:5000/orgmatrix_be
