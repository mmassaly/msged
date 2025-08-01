
const directoryRoutes = require('../directory');

test('test function RenameRoomsContainingOldPathWithNewPath',()=>{

    const oldPath = '/old/path';
    const newPath = '/new/path';
    const rooms = {'/old/path':['/old/path','/path1']};
    const expectedRooms = {'/new/path':['/new/path','/path1']};
    
    const result = directoryRoutes.RenameRoomsContainingOldPathWithNewPath(oldPath, newPath,rooms);
    
    expect(result).toEqual(expectedRooms);
});