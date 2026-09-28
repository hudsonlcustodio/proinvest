import{render,screen,waitFor,cleanup}from"@testing-library/react";import{afterEach,describe,expect,it,vi}from"vitest";import{ConnectionsPage,SyncPage,ReconciliationPage}from"./pages/ConnectionsPages";
afterEach(()=>{cleanup();vi.restoreAllMocks()});
describe("Connections UI",()=>{it("shows only implemented read-only providers",async()=>{vi.stubGlobal("fetch",vi.fn(async(input:string|URL)=>new Response(JSON.stringify(String(input).endsWith("/providers")?{items:[{key:"FILE_IMPORT",name:"Importação CSV",kind:"FILE",readOnly:true,capabilities:["READ_FILE","FETCH_RECORDS"],available:true}]}:{items:[]}),{status:200,headers:{"content-type":"application/json"}})));render(<ConnectionsPage/>);await waitFor(()=>expect(screen.getByText("Importação CSV")).toBeTruthy());expect(screen.getAllByText(/somente leitura/).length).toBeGreaterThan(0);expect(document.body.textContent).not.toMatch(/Binance|Bybit|Coinbase|XP|BTG/)});it("renders sanitized empty sync and reconciliation states",async()=>{vi.stubGlobal("fetch",vi.fn(async(input:string|URL)=>new Response(JSON.stringify(String(input).includes("strategies")||String(input).includes("accounts")||String(input).includes("instruments")?{items:[]}:{items:[]}),{status:200,headers:{"content-type":"application/json"}})));const{unmount}=render(<SyncPage/>);await waitFor(()=>expect(screen.getByText("Nenhuma sincronização")).toBeTruthy());unmount();render(<ReconciliationPage/>);await waitFor(()=>expect(screen.getByText("Nada para reconciliar")).toBeTruthy())})});
describe("Connections error states",()=>{
  it("does not present an API failure as an empty sync",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code:"CONNECTION_ERROR"}),{status:500,headers:{"content-type":"application/json"}})));
    render(<SyncPage/>);
    await waitFor(()=>expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText("Não foi possível carregar os dados")).toBeTruthy();
    expect(screen.queryByText("Nenhuma sincronização")).toBeNull();
  });
  it("shows connection load failures as errors, not successful notices",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(JSON.stringify({code:"CONNECTION_ERROR"}),{status:500,headers:{"content-type":"application/json"}})));
    render(<ConnectionsPage/>);
    await waitFor(()=>expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Nenhuma conexão configurada")).toBeNull();
  });
});
