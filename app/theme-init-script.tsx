/**
 * Inline script that runs before first paint to apply stored theme and background,
 * avoiding a flash.
 */
export function ThemeInitScript() {
  const script = `
(function(){
  var r=document.documentElement;
  var bk='hackoncod_settings_background';
  var bv=['default','light','lighter','dark','darker','darkest','amoled'];
  var bg=localStorage.getItem(bk);
  if(bg&&bv.indexOf(bg)!==-1){
    r.setAttribute('data-background',bg);
    if(['dark','darker','darkest','amoled'].indexOf(bg)!==-1)r.classList.add('dark');
    else r.classList.remove('dark');
  }else{
    r.setAttribute('data-background','darker');
    r.classList.add('dark');
  }
  var k='hackoncod_settings_theme';
  var t=localStorage.getItem(k);
  var v=['purple','green','blue','red','orange','pink','cyan'];
  r.setAttribute('data-theme',(t&&v.indexOf(t)!==-1)?t:'purple');
})();
`

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
