# ServoSkull Demo Guide

**Interactive Demonstration Flows for the AI Desktop Companion**

---

## Getting Started with Your Demo

This guide walks through the key interaction flows to showcase ServoSkull's multimodal AI capabilities. Perfect for demonstrations, testing, or exploring the system's features.

## Pre-Demo Checklist

### System Requirements Check
- [ ] **Browser**: Chrome/Edge (latest version recommended)
- [ ] **Microphone**: Working and permitted
- [ ] **Camera**: Working and permitted  
- [ ] **Network**: Stable connection for OpenAI API
- [ ] **API Key**: Valid OpenAI API key configured

### Application Status Verification
1. **Start ServoSkull**: `dotnet run --project ServoSkull.AppHost`
2. **Aspire Dashboard**: Check all services are healthy at `http://localhost:18888`
3. **Frontend**: Verify Angular app loads at `http://localhost:4200`
4. **SignalR**: Confirm "Connected to chat hub" appears in the interface

## Demo Flow 1: Voice-Activated Conversation

**Objective**: Demonstrate hands-free AI interaction

### Steps

1. **Enable Voice Monitoring**
   - Click the microphone button in the interface
   - Observe the audio level indicator responding to ambient sound
   - **Expected**: Green microphone icon indicates active monitoring

2. **Initiate Voice Conversation**
   - Speak clearly: *"Hello ServoSkull, can you hear me?"*
   - Watch for voice detection indicators (visual feedback)
   - **Expected**: Recording starts when voice detected, stops after silence

3. **Observe AI Processing**
   - Note the transcription appearing in the input field
   - Watch message automatically send after transcription
   - **Expected**: Text appears → Message sends → AI responds with both text and speech

4. **Experience Response**
   - AI response appears as text in chat
   - Audio playback begins automatically
   - **Expected**: Natural text-to-speech voice response

### Troubleshooting Tips
- **No voice detection**: Check microphone permissions and audio levels
- **Poor transcription**: Speak clearly and reduce background noise
- **No audio response**: Check browser audio permissions and volume

## Demo Flow 2: Visual AI Interaction

**Objective**: Showcase computer vision capabilities

### Steps

1. **Enable Camera**
   - Click the camera button to start webcam
   - Position yourself in the camera view
   - **Expected**: Live webcam preview appears

2. **Visual Context Conversation**
   - Type or say: *"What do you see in my camera?"*
   - Ensure you're visible in the webcam preview
   - **Expected**: AI analyzes the captured frame and describes what it sees

3. **Interactive Visual Tasks**
   - Hold up objects: *"What am I holding?"*
   - Change lighting: *"How does the lighting look now?"*
   - Make gestures: *"What gesture am I making?"*
   - **Expected**: AI provides contextual responses based on visual input

4. **Multimodal Combination**
   - Use voice while gesturing: *"Can you see me waving?"*
   - **Expected**: AI processes both audio and visual inputs simultaneously

### Best Practices
- **Good Lighting**: Ensure adequate lighting for clear image capture
- **Camera Position**: Keep yourself centered in the camera frame
- **Clear Objects**: Hold items clearly visible to the camera

## Demo Flow 3: Contextual Conversation

**Objective**: Demonstrate conversation memory and context awareness

### Steps

1. **Establish Context**
   - Start with: *"My name is [Your Name] and I'm demonstrating ServoSkull"*
   - **Expected**: AI acknowledges and remembers your name

2. **Build Conversation History**
   - Ask follow-up questions that require memory:
     - *"What did I just tell you my name was?"*
     - *"What am I demonstrating today?"*
   - **Expected**: AI recalls previous conversation elements

3. **Complex Context Building**
   - Share information: *"I'm a developer working on AI applications"*
   - Later reference: *"Given my background, what do you think of this project?"*
   - **Expected**: AI incorporates previous context into responses

4. **Multi-turn Problem Solving**
   - Pose a problem: *"I need to optimize the voice detection in this app"*
   - Ask follow-ups: *"What specific techniques would you recommend?"*
   - **Expected**: AI maintains context across multiple exchanges

## Demo Flow 4: Technical Showcase

**Objective**: Highlight technical capabilities for developer audiences

### Steps

1. **Architecture Overview**
   - Say: *"Explain how this application works technically"*
   - **Expected**: AI describes the architecture based on its understanding

2. **Real-time Performance**
   - Demonstrate rapid interactions:
     - Quick voice commands
     - Fast typing with camera enabled
     - Multiple modality switches
   - **Expected**: System maintains responsiveness

3. **Error Handling**
   - Intentionally trigger recoverable errors:
     - Cover camera briefly
     - Speak very quietly
     - Send empty messages
   - **Expected**: Graceful error handling and recovery

4. **Monitoring Integration**
   - Show Aspire Dashboard at `http://localhost:18888`
   - Point out service health, logs, and metrics
   - **Expected**: Real-time system monitoring visibility

## Advanced Demo Scenarios

### Scenario A: Creative Collaboration

```
User: "I'm working on a logo design. Let me show you what I have."
[Show sketch to camera]
AI: [Analyzes and provides feedback]
User: "What colors would you suggest?"
AI: [Provides color recommendations based on visual input]
```

### Scenario B: Problem-Solving Session

```
User: "I'm having trouble with the audio detection being too sensitive."
AI: [Provides technical suggestions]
User: "Show me in the code where I would make those changes."
AI: [References specific code locations based on codebase knowledge]
```

### Scenario C: Educational Demonstration

```
User: "Explain how voice activity detection works while I'm speaking."
AI: [Explains concepts while processing the user's live voice]
User: "Now analyze what you can see while I demonstrate the concept."
[User shows relevant gestures or objects]
```

## Demo Best Practices

### Preparation
- **Script Key Phrases**: Prepare impactful demonstration phrases
- **Test Environment**: Verify all components work before demo
- **Backup Plans**: Have alternative demos ready for technical issues
- **Timing**: Allow sufficient time for AI processing responses

### Presentation Tips
- **Explain Context**: Help audience understand what they're seeing
- **Show Technical Details**: Use browser dev tools to show real-time data
- **Highlight Uniqueness**: Point out multimodal integration features
- **Address Questions**: Be prepared to explain architecture and choices

### Common Demo Scenarios

| Audience Type | Focus Areas | Key Messages |
|---------------|-------------|---------------|
| **Technical** | Architecture, APIs, Performance | Modern stack, scalable design |
| **Business** | Use cases, ROI, Future potential | AI capabilities, market opportunity |
| **Academic** | Research applications, Innovation | Multimodal processing, HCI advancement |
| **General** | User experience, Practical benefits | Natural interaction, Accessibility |

## Troubleshooting Common Demo Issues

### Audio Problems
- **No voice detection**: Check microphone permissions in browser
- **Poor transcription**: Reduce background noise, speak clearly
- **No audio playback**: Verify browser audio permissions

### Video Problems  
- **Camera not working**: Check camera permissions and hardware
- **Poor image quality**: Adjust lighting and camera position
- **No visual analysis**: Ensure camera frame is being captured

### Connection Issues
- **SignalR disconnection**: Check network stability and API availability
- **Slow responses**: Verify OpenAI API key and quota limits
- **Service failures**: Use Aspire Dashboard to diagnose service issues

### Performance Issues
- **High latency**: Check network connection and system resources
- **Memory usage**: Monitor browser and system memory consumption
- **CPU usage**: Verify system meets minimum requirements

## Demo Metrics and Success Indicators

### Technical Metrics
- **Response Time**: < 3 seconds for typical interactions
- **Voice Recognition Accuracy**: > 90% for clear speech
- **System Uptime**: All services healthy in Aspire Dashboard
- **Error Rate**: < 5% failed interactions

### User Experience Metrics
- **Interaction Flow**: Smooth transitions between modalities
- **Context Retention**: AI remembers conversation history
- **Natural Responses**: Contextually appropriate AI responses
- **Recovery Handling**: Graceful error recovery

---

*This demo guide ensures consistent, impactful demonstrations of ServoSkull's multimodal AI capabilities across different audiences and scenarios.*