// A generated feed for the opt-in presenter on localhost. It uses no device or desktop capture.
if (window.top !== window && sessionStorage.getItem('blazeroom-local-share-demo') === 'true') {
  navigator.mediaDevices.getDisplayMedia = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const start = performance.now();
    const draw = () => {
      const elapsed = (performance.now() - start) / 1000;
      ctx.fillStyle = '#101821';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#fd9568';
      ctx.font = '600 24px sans-serif';
      ctx.fillText('BLAZEROOM / LOCAL SCREEN SHARE', 64, 80);
      ctx.fillStyle = '#f4ede4';
      ctx.font = '600 70px sans-serif';
      ctx.fillText('Live feed', 64, 174);
      ctx.font = '32px monospace';
      ctx.fillText(`${elapsed.toFixed(1)} s`, 65, 235);
      for (let index = 0; index < 40; index += 1) {
        const height = 50 + (1 + Math.sin(index * 0.42 - elapsed * 2)) * 118;
        ctx.fillStyle = index % 5 === 0 ? '#fd9568' : '#507c94';
        ctx.fillRect(64 + index * 29, 622 - height, 20, height);
      }
    };
    draw();
    const stream = canvas.captureStream(15);
    const [track] = stream.getVideoTracks();
    const interval = window.setInterval(() => {
      if (track.readyState === 'ended') window.clearInterval(interval);
      else draw();
    }, 67);
    return stream;
  };

  // The button mounts before the SFU is ready to publish a track.
  const attempts = window.setInterval(() => {
    const button = document.querySelector('[data-testid="incall_screenshare"]');
    if (button?.getAttribute('data-kind') === 'primary') window.clearInterval(attempts);
    else if (button && !button.disabled) button.click();
  }, 2000);
  window.setTimeout(() => window.clearInterval(attempts), 30000);
}
