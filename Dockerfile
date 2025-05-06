# Use slim Node image with build tools
FROM node:23-slim

# Set working directory
WORKDIR /app

# Install system deps for canvas and Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install JS dependencies
COPY package*.json ./
RUN npm install

# Copy the entire project
COPY . .

# Set up Python virtual environment and install dependencies
RUN python3 -m venv /app/livekit-agent-server/venv && \
    /app/livekit-agent-server/venv/bin/pip install --upgrade pip && \
    /app/livekit-agent-server/venv/bin/pip install -r /app/livekit-agent-server/requirements.txt

RUN /app/livekit-agent-server/venv/bin/pip install python-dotenv
RUN ls
RUN /app/livekit-agent-server/venv/bin/python /app/livekit-agent-server/vpa_new/main.py download-files

RUN cd /app/webrtc-token-service
RUN npm install
RUN cd ..

RUN cd /app/vocab-canvas-service
RUN npm install
RUN cd ..

# Expose the Next.js dev server port
EXPOSE 3000
EXPOSE 3002

CMD ["bash", "-c", "cd /app/webrtc-token-service && npm run dev & /app/livekit-agent-server/venv/bin/python /app/livekit-agent-server/vpa_new/main.py connect --room Speakingpage --page-path speakingpage & exec npm run dev"]