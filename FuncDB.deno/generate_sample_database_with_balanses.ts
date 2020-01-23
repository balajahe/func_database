import { DBCore } from './core/DBCore.ts'
import { DBMeta } from './core/DBMeta.ts'

const dbpath = './sample_database/'

let personcou = 5000
let nomencou = 3000
let stockcou = 50
let doccou = 333333
let maxlinecou = 50
const mut_scale = 1/20

let db: DBCore
let ts: number

try {
    Deno.removeSync(dbpath, {recursive: true})
} catch(_) {}
Deno.mkdirSync(dbpath)

Deno.openSync(dbpath + DBMeta.data_immut, 'w').close()
Deno.openSync(dbpath + DBMeta.data_mut_current, 'w').close()
gen_file()
Deno.renameSync(dbpath + DBMeta.data_mut_current, dbpath + DBMeta.data_immut)
Deno.openSync(dbpath + DBMeta.data_mut_current, 'w').close()

personcou = Math.floor(personcou * mut_scale)
nomencou = Math.floor(nomencou * mut_scale)
stockcou = Math.floor(stockcou * mut_scale)
doccou = Math.floor(doccou * mut_scale)
gen_file()


function gen_file() {
    db = DBCore.open(dbpath)
    ts = Date.now()
    gen_persons()
    gen_nomens()
    gen_stocks()
    gen_docs()
    db.flush(true) // кэш не записываем
}

// persons (partners)
function gen_persons() {
    const person_types = ['retail', 'wholesale']
    for (let i = 0; i < personcou; i++) {
        let doc = 
            {
                sys: {
                    class: 'ref',
                    code: 'person.' + i,
                    id: 'person.' + i + '^' + ts
                },
                type: 'person.' + arand(person_types),
                name: 'person ' + i 
            }
        db.add_mut(doc)
    }
}

// stock nomenclature
async function gen_nomens() {
    const nomen_types = ['tool', 'material', 'asset']
    for (let i = 0; i < nomencou; i++) {
        let doc = 
            {
                sys: {
                    class: 'ref',
                    code: 'nomen.' + i,
                    id: 'nomen.' + i + '^' + ts
                },
                type: 'nomen.' + arand(nomen_types),
                name: 'nomen ' + i 
            }
        db.add_mut(doc)
    }
}

// stocks (warehouses) including goods in transit
async function gen_stocks() {
    const stock_types = ['storage', 'transfer']
    for (let i = 0; i < stockcou; i++) {
        let doc =
            {
                sys: {
                    class: 'ref',
                    code: 'stock.' + i,
                    id: 'stock.' + i + '^' + ts
                },
                type: 'stock.' + arand(stock_types),
                name: 'stock ' + i 
            }
        db.add_mut(doc)
    } 
}

// all documents: purch, transfer, sale
async function gen_docs() {
    const date = new Date().toISOString().substr(0,10)
    const doc_types = ['purch', 'transfer', 'sale']
    let couall = 0
    let cou = 0
    for (let doctype of doc_types) {
        let i = 0
        while (i < doccou) {
            let doc: any =
                {
                    sys: {
                        class: doctype,
                        code: doctype + '.' + i,
                        id: doctype + '.' + i + '^' + ts  
                    },
                    type: doctype,
                    date: date,
                    person: 'person.' + irand(0, personcou-1) + '^' + ts
                }
            if (doctype !== 'transfer') {
                doc.stock = 'stock.' + irand(0, stockcou-1) + '^' + ts
            } else {
                doc.stock1 = 'stock.' + irand(0, stockcou-1) + '^' + ts
                doc.stock2 = 'stock.' + irand(0, stockcou-1) + '^' + ts
            }
            doc.lines = []
            for (let j = 0; j < irand(1, maxlinecou); j++) {
                const nomen = 'nomen.' + irand(0, nomencou-1) + '^' + ts
                doc.lines.push(
                    {
                        nomen: nomen,
                        qty: irand(1, 30),
                        price: frand(100, 300)
                    }
                )
            }
            const add_ok = db.add_mut(doc)
            if (add_ok) {
                i++
                couall++
                cou++
                if (cou === 10000) {
                    console.log('generated docs in memory - ' + couall + '\x1b[1A')
                    cou = 0
                }
            }
        }
    }
    console.log('generated docs - ' + couall + ', writing file...')
} 

function frand(min: number, max: number): number {
    const rand = min + Math.random() * (max - min)
    return rand
}

function irand(min: number, max: number): number {
    const rand = min + Math.random() * (max + 1 - min)
    return Math.floor(rand)
}
  
function arand(arr: any[]): any {
    const rand = Math.random() * arr.length
    return arr[Math.floor(rand)]
}
