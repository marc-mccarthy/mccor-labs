# Stag charge, text only: chain with Extend

Created: 2026-10-14. Last updated: 2026-10-14.

Goal: get the stag to rear up, charge the lens and burst into particles using only text prompts and the existing start frame. No new images.

Idea: give Kling one action per generation and extend the same video, instead of asking for every action in one 5s clip.

## How to extend a video in Kling

From Kling's guide ([Extend with Prompts](https://kling.ai/quickstart/ai-video-extension)):

1. Generate the first video as usual.
2. When it finishes, open the **Extend** tab at the bottom left of the video.
3. Choose a mode:
   - **Auto-Extend:** no prompt. The model continues the video on its own.
   - **Customized Extend:** you type a prompt for what happens next. Use this one.
4. Paste the next step's prompt and generate. Each extension adds about 4 to 5 seconds.
5. Repeat on the extended video for the next step. Videos can be extended up to 3 minutes total.

Kling's notes:

- Prompt formula: **Subject + Movement**, one main subject.
- "The prompt needs to be consistent with the main subject of the original video; unrelated text may cause a camera cut or transition."
- Extending is random. It may take several tries to get a good result.
- Each extension is a separate generation and uses credits ([atlascloud](https://www.atlascloud.ai/blog/guides/kling-ai-video-length-limit)).

The guide does not say which models support Extend. Check that the Extend tab appears under your Kling 3.0 video.

## Steps

### 1. Rear up

- Start frame: `/Users/mj/Downloads/mccor-stag-starting.png`
- Length: 5s
- End frame: none

```
Fixed tripod shot. The glowing wireframe stag lifts its front legs off the floor and stands tall on its hind legs, chest raised, front hooves pawing the air, then lands back on all four hooves in a flash of orange light.
```

### 2. Extend: charge

```
Fixed tripod shot. The stag turns to face the camera and gallops straight at the lens along the right side of the frame, growing larger with every stride until its head and antlers fill the screen.
```

### 3. Extend: impact

```
Fixed tripod shot. The stag's antlers strike the lens, the screen cracks like glass, and the stag bursts into glowing orange shards, wireframe fragments and sparks that fill the whole screen.
```

## If there is no Extend tab

Pause each finished clip on its last frame and screenshot it. Use that screenshot as the start frame for the next step's prompt. It is still Kling's own frame, not a new asset.

## Tips

- Generate 4 versions at each step and extend only the best one.
- Keep "Fixed tripod shot" at the start of every prompt.
- Keep the stag as the only subject in every prompt, so Kling does not cut away.

## Why this should work better

- Each prompt is one simple action, which matches Kling's prompt guidance.
- Each step starts where the last one ended, so there is never a big jump between frames.
- "The screen cracks like glass" gives the model something it can draw on the screen itself, instead of asking the stag to pass through the camera. This is an inference, not verified.

## Not verified

- Whether Kling 3.0 on the website shows the Extend tab.
- How reliable this is overall. Splitting the actions should help, but the success rate is unknown until it is run.
