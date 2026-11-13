// icon_shapes.js - Spabot icon shape builders (shared by content pages
// and the options page live preview). Shape skins define a completely
// different DOM structure instead of restyling the default capsule-head
// robot. Facial parts reuse .spabot-eye / .spabot-mouth so the shared
// blink animation and other common styles keep working.

function spabotEl(cls) {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

// Default: capsule head + dark face screen (eyes + mouth)
function buildDefaultIcon() {
  const icon = spabotEl('spabot-icon');
  const head = spabotEl('spabot-head');
  const faceScreen = spabotEl('spabot-face-screen');
  faceScreen.appendChild(spabotEl('spabot-eye left'));
  faceScreen.appendChild(spabotEl('spabot-eye right'));
  faceScreen.appendChild(spabotEl('spabot-mouth'));
  head.appendChild(faceScreen);
  icon.appendChild(head);
  return icon;
}

// UFO: alien eyes in a glass dome, saucer body with blinking lights and beam
function buildUfoIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-ufo');
  const dome = spabotEl('spabot-ufo-dome');
  dome.appendChild(spabotEl('spabot-eye left'));
  dome.appendChild(spabotEl('spabot-eye right'));
  const saucer = spabotEl('spabot-ufo-saucer');
  for (let i = 0; i < 3; i++) saucer.appendChild(spabotEl('spabot-ufo-light'));
  icon.appendChild(dome);
  icon.appendChild(saucer);
  icon.appendChild(spabotEl('spabot-ufo-beam'));
  return icon;
}

// Cat: round head with pointy ears and whiskers
function buildCatIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-cat');
  icon.appendChild(spabotEl('spabot-cat-ear left'));
  icon.appendChild(spabotEl('spabot-cat-ear right'));
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(spabotEl('spabot-mouth'));
  head.appendChild(spabotEl('spabot-cat-whisker left'));
  head.appendChild(spabotEl('spabot-cat-whisker right'));
  icon.appendChild(head);
  return icon;
}

// Astro: astronaut helmet with beacon antenna and a dark visor
function buildAstroIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-astro');
  icon.appendChild(spabotEl('spabot-astro-antenna'));
  const head = spabotEl('spabot-head');
  const visor = spabotEl('spabot-astro-visor');
  visor.appendChild(spabotEl('spabot-eye left'));
  visor.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(visor);
  icon.appendChild(head);
  return icon;
}

// Octo: dome head with four wiggling tentacles
function buildOctoIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-octo');
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(spabotEl('spabot-mouth'));
  icon.appendChild(head);
  const tentacles = spabotEl('spabot-octo-tentacles');
  for (let i = 0; i < 4; i++) tentacles.appendChild(spabotEl('spabot-octo-tentacle'));
  icon.appendChild(tentacles);
  return icon;
}

// Panda: white head, black ears and eye patches
function buildPandaIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-panda');
  icon.appendChild(spabotEl('spabot-panda-ear left'));
  icon.appendChild(spabotEl('spabot-panda-ear right'));
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-panda-patch left'));
  head.appendChild(spabotEl('spabot-panda-patch right'));
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(spabotEl('spabot-panda-nose'));
  head.appendChild(spabotEl('spabot-mouth'));
  icon.appendChild(head);
  return icon;
}

// Duck: yellow round head with an orange flat beak and a hair tuft
function buildDuckIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-duck');
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  icon.appendChild(head);
  icon.appendChild(spabotEl('spabot-duck-beak'));
  return icon;
}

// Penguin: dark body, white belly, orange beak and feet
function buildPenguinIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-penguin');
  icon.appendChild(spabotEl('spabot-penguin-foot left'));
  icon.appendChild(spabotEl('spabot-penguin-foot right'));
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-penguin-belly'));
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  icon.appendChild(head);
  icon.appendChild(spabotEl('spabot-penguin-beak'));
  return icon;
}

// Bunny: white round head with long pink-lined ears and blush cheeks
function buildBunnyIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-bunny');
  icon.appendChild(spabotEl('spabot-bunny-ear left'));
  icon.appendChild(spabotEl('spabot-bunny-ear right'));
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(spabotEl('spabot-bunny-nose'));
  head.appendChild(spabotEl('spabot-bunny-cheek left'));
  head.appendChild(spabotEl('spabot-bunny-cheek right'));
  icon.appendChild(head);
  return icon;
}

// Frog: green wide head with goggle-like eye bumps
function buildFrogIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-frog');
  const bumpLeft = spabotEl('spabot-frog-bump left');
  bumpLeft.appendChild(spabotEl('spabot-eye'));
  const bumpRight = spabotEl('spabot-frog-bump right');
  bumpRight.appendChild(spabotEl('spabot-eye'));
  icon.appendChild(bumpLeft);
  icon.appendChild(bumpRight);
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-mouth'));
  head.appendChild(spabotEl('spabot-frog-cheek left'));
  head.appendChild(spabotEl('spabot-frog-cheek right'));
  icon.appendChild(head);
  return icon;
}

// Slime: translucent jelly dome with a gloss highlight
function buildSlimeIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-slime');
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-eye left'));
  head.appendChild(spabotEl('spabot-eye right'));
  head.appendChild(spabotEl('spabot-mouth'));
  icon.appendChild(head);
  return icon;
}

// Bilibili TV: blue outline TV with antennae and two pill eyes (official icon style)
function buildBiliTvIcon() {
  const icon = spabotEl('spabot-icon spabot-shape-bili-tv');
  icon.appendChild(spabotEl('spabot-bili-antenna left'));
  icon.appendChild(spabotEl('spabot-bili-antenna right'));
  const head = spabotEl('spabot-head');
  head.appendChild(spabotEl('spabot-bili-eye left'));
  head.appendChild(spabotEl('spabot-bili-eye right'));
  icon.appendChild(head);
  return icon;
}

const SKIN_ICON_BUILDERS = {
  ufo: buildUfoIcon,
  cat: buildCatIcon,
  astro: buildAstroIcon,
  octo: buildOctoIcon,
  panda: buildPandaIcon,
  duck: buildDuckIcon,
  penguin: buildPenguinIcon,
  bunny: buildBunnyIcon,
  frog: buildFrogIcon,
  slime: buildSlimeIcon,
  'bili-tv': buildBiliTvIcon
};

function buildIcon(skin) {
  const builder = SKIN_ICON_BUILDERS[skin] || buildDefaultIcon;
  return builder();
}
