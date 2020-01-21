import { DBCore } from './core/DBCore.ts' 
const db = DBCore.open('./sample_database/')  
 
calc(db)

db.add_mut(JSON.parse(`
    {
        "sys": {
            "class": "sale",
            "code": "sale.XXX" 
        },
        "type": "sale",
        "date": "2020-01-21",
        "person": "person.2^1579595649996",
        "stock": "stock.18^1579595649996",
        "lines": [
            {
                "nomen": "nomen.6^1579595649996",
                "qty": 8,
                "price": 295.5228788368553
            }
        ]
    }
`))

calc(db)

function calc(db: DBCore) {
    let res = db.reduce(
        (_, doc) => doc.type == 'sale', // фильтруем только продажи
        (result, doc) => {
            result.doccou++
            doc.lines.forEach(line => { // цикл по строкам документа
                result.linecou++
                result.amount += line.price * line.qty
            })
        },
        {amount: 0, doccou: 0, linecou: 0} // инициализируем аккумулятор
    )
    console.log(`
        amount total = ${res.amount}
        amount per document = ${res.amount / res.doccou}
        lines per document = ${res.linecou / res.doccou}`
    )
}
