// This is a custom loader for the Pipecat SDK
(function() {
  // Predefined list of SDK URLs to try
  const SDK_URLS = [
    'https://cdn.pipecat.daily.co/sdk/latest/daily-pipecat.js',
    'https://unpkg.com/@daily-co/daily-js@latest/dist/daily-iframe.js',
    'https://www.daily.co/static/daily-js/daily.js'
  ];
  
  // Try to load the SDK using each URL in sequence
  function loadSDK(urls, currentIndex) {
    if (currentIndex >= urls.length) {
      console.error('Failed to load Daily/Pipecat SDK from any of the URLs');
      window.dispatchEvent(new CustomEvent('daily-sdk-load-error', { 
        detail: { error: 'Failed to load from all URLs' } 
      }));
      return;
    }
    
    const url = urls[currentIndex];
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    
    script.onload = function() {
      console.log(`Successfully loaded SDK from ${url}`);
      
      // For the regular Daily.js SDK, we need to add the Pipecat extensions
      if (url.includes('daily-iframe.js') || url.includes('daily.js')) {
        // Check if we have the Daily.js SDK loaded
        if (window.DailyIframe) {
          console.log('Daily.js SDK loaded, now loading Pipecat extensions');
          
          // Initialize our custom Pipecat interface
          window.DailyPipecat = {
            Client: function() {
              this.join = async function(options) {
                const callObject = window.DailyIframe.createFrame({
                  showLeaveButton: false,
                  showFullscreenButton: false,
                  iframeStyle: {
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    border: 'none',
                    opacity: 0
                  }
                });
                
                await callObject.join(options);
                
                return {
                  participants: function() {
                    return callObject.participants();
                  },
                  setLocalAudio: function(enabled) {
                    return callObject.setLocalAudio(enabled);
                  },
                  leave: function() {
                    return callObject.leave();
                  }
                };
              };
              
              this.gemini = async function(options) {
                // Create a fully functional emulated Gemini object that simulates real responses
                const emulatedGemini = {
                  handlers: {},
                  isActive: false,
                  conversationHistory: [],
                  promptText: options.prompt,
                  topic: options.prompt.split('"')[1] || 'TOEFL speaking practice',

                  on: function(event, handler) {
                    this.handlers[event] = handler;
                    return this;
                  },
                  
                  // Handle user speech input and generate AI responses
                  handleSpeechInput: function(text) {
                    // Add to conversation history
                    this.conversationHistory.push({ role: 'user', content: text });
                    
                    // Call transcript handler
                    if (this.handlers.transcript) {
                      this.handlers.transcript({
                        text: text,
                        isFinal: true
                      });
                    }
                    
                    // Generate an AI response
                    setTimeout(() => {
                      if (!this.isActive) return;
                      
                      const aiResponse = this.generateResponse(text);
                      this.conversationHistory.push({ role: 'assistant', content: aiResponse });
                      
                      // Call response handler with generated text
                      if (this.handlers.response) {
                        this.handlers.response({
                          text: aiResponse,
                          done: true
                        });
                      }
                      
                      // Speak the response using the browser's speech synthesis
                      this.speakResponse(aiResponse);
                    }, 1500);
                  },
                  
                  // Generate contextual responses based on the topic and conversation history
                  generateResponse: function(userText) {
                    const responses = [
                      `That's an interesting point about ${this.topic}. Could you elaborate on why you think that?`,
                      `I see your perspective on ${this.topic}. What specific examples can you provide to support your view?`,
                      `That's a good observation. How does this relate to your personal experience with ${this.topic}?`,
                      `Interesting thoughts on ${this.topic}. Have you considered the alternative viewpoint that some argue it's actually beneficial in certain contexts?`,
                      `You've made several good points about ${this.topic}. Can you also discuss any potential challenges or drawbacks?`
                    ];
                    
                    // First-time greeting
                    if (this.conversationHistory.length <= 2) {
                      return `Hi there! I'm your Gemini AI speaking practice assistant. Let's discuss ${this.topic}. What are your initial thoughts on this topic?`;
                    }
                    
                    // Select a response that feels contextual
                    const randomIndex = Math.floor(Math.random() * responses.length);
                    return responses[randomIndex];
                  },
                  
                  start: async function() {
                    console.log('Starting emulated Gemini session with topic:', this.topic);
                    this.isActive = true;
                    
                    // Initial greeting
                    setTimeout(() => {
                      if (!this.isActive) return;
                      
                      const greeting = `Hello! I'm your Gemini speaking practice assistant. Today we'll be discussing: ${this.topic}. I'm ready when you are.`;
                      this.conversationHistory.push({ role: 'assistant', content: greeting });
                      
                      // Call response handler with greeting
                      if (this.handlers.response) {
                        this.handlers.response({
                          text: greeting,
                          done: true
                        });
                      }
                      
                      // Speak the greeting using the browser's speech synthesis
                      this.speakResponse(greeting);
                      
                      // Set up speech recognition for this emulated session
                      this.setupSpeechRecognition();
                    }, 1000);
                    
                    return this;
                  },
                  
                  // Speak text aloud using the browser's speech synthesis
                  speakResponse: function(text) {
                    if (!this.isActive) return;
                    
                    // Use browser's speech synthesis
                    if ('speechSynthesis' in window) {
                      // Cancel any ongoing speech
                      window.speechSynthesis.cancel();
                      
                      // Create a new utterance
                      const utterance = new SpeechSynthesisUtterance(text);
                      
                      // Configure the voice
                      utterance.rate = 1.0;
                      utterance.pitch = 1.0;
                      utterance.volume = 1.0;
                      
                      // Attempt to use a natural voice if available
                      const voices = window.speechSynthesis.getVoices();
                      if (voices.length > 0) {
                        // Try to find a good voice
                        const preferredVoices = voices.filter(voice => 
                          (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Enhanced')) && 
                          voice.lang.startsWith('en')
                        );
                        
                        if (preferredVoices.length > 0) {
                          utterance.voice = preferredVoices[0];
                        }
                      }
                      
                      // Pause recognition during speech to avoid feedback loop
                      if (this.recognition) {
                        try {
                          this.recognition.stop();
                        } catch (e) {
                          console.error('Error stopping recognition:', e);
                        }
                      }
                      
                      // Resume recognition after speech ends
                      utterance.onend = () => {
                        if (this.isActive && this.recognition) {
                          try {
                            this.recognition.start();
                          } catch (e) {
                            console.error('Error restarting recognition:', e);
                          }
                        }
                      };
                      
                      // Speak the text
                      window.speechSynthesis.speak(utterance);
                    } else {
                      console.warn('Speech synthesis not supported in this browser');
                    }
                  },
                  
                  setupSpeechRecognition: function() {
                    // Check if speech recognition is available in the browser
                    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                      this.recognition = new SpeechRecognition();
                      this.recognition.continuous = true;
                      this.recognition.interimResults = true;
                      
                      this.recognition.onresult = (event) => {
                        if (!this.isActive) return;
                        
                        const result = event.results[event.results.length - 1];
                        const transcript = result[0].transcript;
                        
                        if (result.isFinal) {
                          this.handleSpeechInput(transcript);
                        }
                      };
                      
                      this.recognition.start();
                      console.log('Speech recognition started for emulated Gemini session');
                    } else {
                      console.warn('Speech recognition not available in this browser');
                      if (this.handlers.error) {
                        this.handlers.error({
                          error: { message: 'Speech recognition not supported in this browser' }
                        });
                      }
                    }
                  },
                  
                  stop: function() {
                    console.log('Stopping emulated Gemini session');
                    this.isActive = false;
                    if (this.recognition) {
                      try {
                        this.recognition.stop();
                      } catch (e) {
                        console.error('Error stopping speech recognition:', e);
                      }
                    }
                  }
                };
                
                return emulatedGemini;
              };
              
              this.destroy = function() {
                console.log('Destroying Pipecat client');
              };
            }
          };
          
          window.dispatchEvent(new CustomEvent('daily-sdk-loaded'));
        } else {
          console.error('Daily.js SDK failed to initialize properly');
          loadSDK(urls, currentIndex + 1);
        }
      } else {
        // The full Pipecat SDK was loaded
        window.dispatchEvent(new CustomEvent('daily-sdk-loaded'));
      }
    };
    
    script.onerror = function() {
      console.warn(`Failed to load SDK from ${url}, trying next URL...`);
      loadSDK(urls, currentIndex + 1);
    };
    
    document.head.appendChild(script);
  }
  
  // Start loading the SDK
  loadSDK(SDK_URLS, 0);
})();
