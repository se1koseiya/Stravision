import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

// We will store the announcements in a simple JSON file for persistence without needing a DB setup.
const dataFilePath = path.join(process.cwd(), 'data', 'announcements.json')

function ensureDataFile() {
    const dir = path.dirname(dataFilePath)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(dataFilePath)) {
        fs.writeFileSync(dataFilePath, JSON.stringify({ features: [] }, null, 2))
    }
}

export async function GET() {
    try {
        ensureDataFile()
        const content = fs.readFileSync(dataFilePath, 'utf8')
        const data = JSON.parse(content)
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ features: [] })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        // expecting { features: FeatureAnnouncement[] }
        ensureDataFile()
        fs.writeFileSync(dataFilePath, JSON.stringify(body, null, 2))
        return NextResponse.json({ success: true, message: 'Announcements updated directly!' })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update announcements' }, { status: 500 })
    }
}
