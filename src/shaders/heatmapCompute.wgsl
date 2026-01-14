fn latLonToXY(lat: f32, lon: f32) -> vec2f {
    // Since our map area is kiiiiinda small, a linear mapping is okay
    return vec2f(
        (lon - u.mapLongitudeMin) / (u.mapLongitudeMax - u.mapLongitudeMin),
        (lat - u.mapLatitudeMin) / (u.mapLatitudeMax - u.mapLatitudeMin),
    );
}

fn xyToCellIndex(xy: vec2f) -> u32 {
    let x: u32 = u32(xy.x * u.gridWidth);
    let y: u32 = u32(xy.y * u.gridHeight);
    return y * u32(u.gridWidth) + x;
}

// Your code here :)
