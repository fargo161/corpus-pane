import asyncio, json
from harness import *
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(browser,size=(1500,950))
  await p.click('#starterButton');await p.wait_for_function("Object.keys(CorpusLab.state.corpus.entries).length===2 && !CorpusLab.state.job")
  await p.select_option('#group','leftArm')
  await p.click('#knowledgeButton')
  await p.wait_for_timeout(150)
  checks={
   'knowledge_tab_open': await p.evaluate("!document.getElementById('tab-knowledge').hidden"),
   'recommended_articles': await p.locator('#knowledgeRecommended [data-article]').count(),
   'article_count': await p.evaluate('Object.keys(CorpusKnowledge.data.articles).length'),
   'version': await p.evaluate('CorpusKnowledge.version'),
   'page_errors': list(errors),
  }
  await p.screenshot(path=str(ROOT/'knowledge_preview.png'))
  ROOT.joinpath('tests/knowledge-ui-results.json').write_text(json.dumps(checks,indent=2))
  assert checks['knowledge_tab_open'] and checks['recommended_articles']>=4 and checks['article_count']>=38 and not checks['page_errors']
  print('PASS knowledge UI',checks)
  await ctx.close();await browser.close()
asyncio.run(main())
